import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

// POST - Générer une prédiction de diabète
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_visite } = body

    if (!id_visite) {
      return NextResponse.json(
        { error: 'ID visite est requis' },
        { status: 400 }
      )
    }

    // Récupérer les données cliniques
    const donneesCliniques = await prisma.donneesCliniquesIA.findUnique({
      where: { id_visite: parseInt(id_visite as string) },
      include: {
        visite: {
          include: {
            consultation: true,
          },
        },
      },
    })

    if (!donneesCliniques) {
      return NextResponse.json(
        { error: 'Données cliniques non trouvées pour cette visite' },
        { status: 404 }
      )
    }

    // Vérifier que les données nécessaires sont présentes
    const requiredFields = ['nombre_grossesses', 'taux_glucose', 'pression_arterielle', 
                           'epaisseur_pli_cutane', 'taux_insuline', 'imc', 
                           'fonction_pedigree_diabete', 'age']
    const missingFields = requiredFields.filter(field => 
      donneesCliniques[field as keyof typeof donneesCliniques] === null || 
      donneesCliniques[field as keyof typeof donneesCliniques] === undefined
    )

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Champs manquants: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Mapper les données vers le format attendu par le modèle
    const modelData = {
      Pregnancies: Number(donneesCliniques.nombre_grossesses) || 0,
      Glucose: Number(donneesCliniques.taux_glucose) || 0,
      BloodPressure: Number(donneesCliniques.pression_arterielle) || 0,
      SkinThickness: Number(donneesCliniques.epaisseur_pli_cutane) || 0,
      Insulin: Number(donneesCliniques.taux_insuline) || 0,
      BMI: Number(donneesCliniques.imc) || 0,
      DiabetesPedigreeFunction: Number(donneesCliniques.fonction_pedigree_diabete) || 0,
      Age: Number(donneesCliniques.age) || 0,
    }

    try {
      // Appeler le modèle ML
      const scriptPath = join(process.cwd(), 'scripts', 'predict_diabete.py')
      const modelPath = join(process.cwd(), 'public', 'models', 'diabete_model')

      const dataJson = JSON.stringify(modelData)
      // Encoder en base64 pour éviter les problèmes d'échappement de guillemets
      const dataJsonBase64 = Buffer.from(dataJson).toString('base64')
      
      let stdout = ''
      let stderr = ''
      
      try {
        // Configurer l'environnement pour trouver libomp sur macOS
        const env = { ...process.env }
        // Chercher libomp dans les emplacements courants
        const possiblePaths = [
          '/opt/homebrew/opt/libomp/lib',
          '/usr/local/opt/libomp/lib',
          '/usr/local/Cellar/llvm/21.1.1/lib',
        ]
        for (const path of possiblePaths) {
          if (existsSync(join(path, 'libomp.dylib'))) {
            env.DYLD_LIBRARY_PATH = path + (env.DYLD_LIBRARY_PATH ? ':' + env.DYLD_LIBRARY_PATH : '')
            break
          }
        }
        
        const result = await execAsync(
          `python3 "${scriptPath}" "${dataJsonBase64}" "${modelPath}"`,
          { 
            timeout: 60000, // 60 secondes
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            env: env
          }
        )
        stdout = result.stdout
        stderr = result.stderr || ''
      } catch (execError: any) {
        console.error('Erreur lors de l\'exécution du script Python:', execError)
        console.error('stdout:', execError.stdout)
        console.error('stderr:', execError.stderr)
        
        // Essayer de parser l'erreur depuis stdout
        if (execError.stdout) {
          try {
            const errorResult = JSON.parse(execError.stdout.trim())
            // Si c'est une erreur XGBoost/OpenMP, donner des instructions claires
            if (errorResult.error && errorResult.error.includes('XGBoost') || errorResult.error.includes('libxgboost') || errorResult.error.includes('OpenMP')) {
              return NextResponse.json(
                { 
                  error: 'XGBoost nécessite OpenMP. Veuillez installer libomp:\n\n' +
                         'macOS: brew install libomp\n' +
                         'Linux: sudo apt-get install libomp-dev (Ubuntu/Debian) ou sudo yum install libgomp (CentOS/RHEL)\n' +
                         'Windows: Installer Visual C++ Redistributable\n\n' +
                         'Puis réinstaller xgboost: pip3 uninstall xgboost && pip3 install xgboost',
                  details: errorResult.error,
                  type: 'XGBOOST_OPENMP_ERROR'
                },
                { status: 500 }
              )
            }
            return NextResponse.json(
              { 
                error: errorResult.error || 'Erreur lors de la prédiction',
                details: errorResult.traceback || execError.message,
                type: 'PYTHON_ERROR'
              },
              { status: 500 }
            )
          } catch (parseError) {
            // Si ce n'est pas du JSON valide, vérifier si c'est une erreur XGBoost dans le texte brut
            const stdoutText = execError.stdout.toString()
            if (stdoutText.includes('XGBoost') || stdoutText.includes('libxgboost') || stdoutText.includes('OpenMP')) {
              return NextResponse.json(
                { 
                  error: 'XGBoost nécessite OpenMP. Veuillez installer libomp:\n\n' +
                         'macOS: brew install libomp\n' +
                         'Linux: sudo apt-get install libomp-dev\n' +
                         'Windows: Installer Visual C++ Redistributable\n\n' +
                         'Puis réinstaller xgboost: pip3 uninstall xgboost && pip3 install xgboost',
                  details: stdoutText,
                  type: 'XGBOOST_OPENMP_ERROR'
                },
                { status: 500 }
              )
            }
          }
        }
        
        const isTimeout = execError.killed && execError.signal === 'SIGTERM'
        
        return NextResponse.json(
          { 
            error: isTimeout 
              ? 'Le modèle prend trop de temps à charger. Veuillez réessayer.'
              : 'Erreur lors de l\'exécution du modèle',
            details: execError.message || execError.stderr || 'Erreur d\'exécution',
            stdout: execError.stdout?.toString().substring(0, 500), // Limiter la taille
            timeout: isTimeout,
            type: 'EXEC_ERROR'
          },
          { status: 500 }
        )
      }

      // Parser le résultat JSON
      const cleanStdout = stdout
        .split('\n')
        .filter(line => line.trim().startsWith('{') || line.trim().startsWith('['))
        .join('\n')
        .trim()
      
      if (!cleanStdout) {
        throw new Error('Aucune sortie JSON du script Python')
      }
      
      const mlResult = JSON.parse(cleanStdout)
      
      if (!mlResult.success) {
        return NextResponse.json(
          { 
            error: mlResult.error || 'Erreur lors de la prédiction',
            details: stderr || 'Erreur inconnue'
          },
          { status: 500 }
        )
      }

      // Utiliser les résultats du modèle ML
      const probabilite = mlResult.probability
      const seuil_utilise = mlResult.threshold || 0.5
      const niveau_confiance = mlResult.confidenceLevel || (probabilite > 0.7 ? 'Élevée' : 'Modérée')
      const isDiabetes = mlResult.prediction === 1
      
      const features_detected = mlResult.details?.features || []
      const interpretation = mlResult.details?.interpretation || ''
      const recommendation = mlResult.details?.recommendation || null

      // Créer la prédiction
      const prediction = await prisma.predictionIA.create({
        data: {
          id_visite: parseInt(id_visite as string),
          maladie_predite: 'DIABETE',
          probabilite: probabilite,
          seuil_utilise: seuil_utilise,
          niveau_confiance: niveau_confiance,
          interpretation: interpretation,
          recommendation: recommendation,
          features_detected: {
            features: features_detected,
          },
          model_version: 'diabete_v1.0',
        },
      })

      // Créer des explicabilités basées sur les features détectées
      const explicabilites = features_detected.map((feature: string, index: number) => {
        const baseContribution = isDiabetes ? 0.4 : -0.3
        const contribution = baseContribution * (1 - index * 0.15)
        return {
          variable: feature,
          contribution: Math.abs(contribution),
        }
      })

      await Promise.all(
        explicabilites.map((exp: { variable: string; contribution: number }) =>
          prisma.explicabiliteIA.create({
            data: {
              id_prediction: prediction.id_prediction,
              variable: exp.variable,
              contribution: exp.contribution,
            },
          })
        )
      )

      // Récupérer la prédiction complète avec explicabilités
      const predictionComplete = await prisma.predictionIA.findUnique({
        where: { id_prediction: prediction.id_prediction },
        include: {
          explicabilites: {
            orderBy: { contribution: 'desc' },
          },
          validations: {
            include: {
              medecin: {
                select: {
                  nom: true,
                  prenom: true,
                },
              },
            },
            orderBy: { date_validation: 'desc' },
          },
        },
      })

      return NextResponse.json(
        {
          message: 'Prédiction générée avec succès',
          prediction: predictionComplete,
        },
        { status: 201 }
      )
    } catch (fileError: any) {
      console.error('Erreur lors de la prédiction:', fileError)
      return NextResponse.json(
        { error: 'Erreur lors de la prédiction', details: fileError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erreur lors de la génération de la prédiction:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de la prédiction', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

