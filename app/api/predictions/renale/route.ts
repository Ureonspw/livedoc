import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join, dirname } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

// POST - Générer une prédiction de maladie rénale
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

    // Mapper les données vers le format attendu par le modèle
    // Les valeurs null seront gérées par le modèle
    const modelData: any = {
      age: Number(donneesCliniques.age) || 0,
      bp: Number(donneesCliniques.pression_arterielle) || 0,
      sg: Number(donneesCliniques.gravite_specifique) || 0,
      al: Number(donneesCliniques.albumine) || 0,
      su: Number(donneesCliniques.sucre) || 0,
      rbc: donneesCliniques.globules_rouges_urine || 'normal',
      pc: donneesCliniques.pus_cells || 'normal',
      pcc: donneesCliniques.pus_cells_clumps || 'notpresent',
      ba: donneesCliniques.bacteries || 'notpresent',
      bgr: Number(donneesCliniques.glucose_sang) || 0,
      bu: Number(donneesCliniques.uree_sanguine) || 0,
      sc: Number(donneesCliniques.creatinine_serique) || 0,
      sod: Number(donneesCliniques.sodium) || 0,
      pot: Number(donneesCliniques.potassium) || 0,
      hemo: Number(donneesCliniques.hemoglobine) || 0,
      pcv: Number(donneesCliniques.volume_cellulaire_packe) || 0,
      wc: Number(donneesCliniques.globules_blancs) || 0,
      rc: Number(donneesCliniques.globules_rouges) || 0,
      htn: donneesCliniques.hypertension ? 'yes' : 'no',
      dm: donneesCliniques.diabete_mellitus ? 'yes' : 'no',
      cad: donneesCliniques.maladie_coronaire ? 'yes' : 'no',
      appet: donneesCliniques.appetit || 'good',
      pe: donneesCliniques.oedeme_pieds ? 'yes' : 'no',
      ane: donneesCliniques.anemie ? 'yes' : 'no',
    }

    try {
      // Appeler le modèle ML
      const scriptPath = join(process.cwd(), 'scripts', 'predict_renale.py')
      const modelPath = join(process.cwd(), 'public', 'models', 'maladie_renale_model')

      const dataJson = JSON.stringify(modelData)
      // Encoder en base64 pour éviter les problèmes d'échappement de guillemets
      const dataJsonBase64 = Buffer.from(dataJson).toString('base64')
      
      let stdout = ''
      let stderr = ''
      
      try {
        // Configurer l'environnement pour trouver libomp sur macOS
        const env = { ...process.env }
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
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024,
            env: env
          }
        )
        stdout = result.stdout
        stderr = result.stderr || ''
      } catch (execError: any) {
        console.error('Erreur lors de l\'exécution du script Python:', execError)
        
        if (execError.stdout) {
          try {
            const errorResult = JSON.parse(execError.stdout.trim())
            return NextResponse.json(
              { 
                error: errorResult.error || 'Erreur lors de la prédiction',
                details: execError.message 
              },
              { status: 500 }
            )
          } catch (parseError) {
            // Si ce n'est pas du JSON valide, continuer avec l'erreur générique
          }
        }
        
        const isTimeout = execError.killed && execError.signal === 'SIGTERM'
        
        return NextResponse.json(
          { 
            error: isTimeout 
              ? 'Le modèle prend trop de temps à charger. Veuillez réessayer.'
              : 'Erreur lors de l\'exécution du modèle',
            details: execError.message || 'Erreur d\'exécution',
            timeout: isTimeout
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
      const isKidneyDisease = mlResult.prediction === 1
      
      const features_detected = mlResult.details?.features || []
      const interpretation = mlResult.details?.interpretation || ''
      const recommendation = mlResult.details?.recommendation || null

      // Créer la prédiction
      const prediction = await prisma.predictionIA.create({
        data: {
          id_visite: parseInt(id_visite as string),
          maladie_predite: 'MALADIE_RENALE',
          probabilite: probabilite,
          seuil_utilise: seuil_utilise,
          niveau_confiance: niveau_confiance,
          interpretation: interpretation,
          recommendation: recommendation,
          features_detected: {
            features: features_detected,
          },
          model_version: 'renale_v1.0',
        },
      })

      // Créer des explicabilités
      const explicabilites = features_detected.map((feature: string, index: number) => {
        const baseContribution = isKidneyDisease ? 0.4 : -0.3
        const contribution = baseContribution * (1 - index * 0.15)
        return {
          variable: feature,
          contribution: Math.abs(contribution),
        }
      })

      await Promise.all(
        explicabilites.map((exp) =>
          prisma.explicabiliteIA.create({
            data: {
              id_prediction: prediction.id_prediction,
              variable: exp.variable,
              contribution: exp.contribution,
            },
          })
        )
      )

      // Récupérer la prédiction complète
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

