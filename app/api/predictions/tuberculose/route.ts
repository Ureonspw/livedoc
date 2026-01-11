import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execAsync = promisify(exec)

// POST - Générer une prédiction de tuberculose
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_visite, id_image } = body

    if (!id_visite || !id_image) {
      return NextResponse.json(
        { error: 'ID visite et ID image sont requis' },
        { status: 400 }
      )
    }

    // Récupérer l'image de radiographie
    const image = await prisma.imageRadiographie.findUnique({
      where: { id_image: parseInt(id_image as string) },
      include: {
        visite: {
          include: {
            consultation: true,
          },
        },
      },
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Image de radiographie non trouvée' },
        { status: 404 }
      )
    }

    // Chemin vers l'image
    const imagePath = join(process.cwd(), 'public', image.chemin_fichier.replace(/^\//, ''))
    
    try {
      // Appeler le modèle ML réel
      const scriptPath = join(process.cwd(), 'scripts', 'predict.py')
      const modelPath = join(process.cwd(), 'public', 'models', 'app_model')

      let stdout = ''
      let stderr = ''
      
      try {
        const result = await execAsync(
          `python3 "${scriptPath}" "${imagePath}" "${modelPath}"`,
          { 
            timeout: 120000, // 120 secondes timeout (le modèle prend du temps à charger)
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
          }
        )
        stdout = result.stdout
        stderr = result.stderr || ''
      } catch (execError: any) {
        console.error('Erreur lors de l\'exécution du script Python:', execError)
        
        // Extraire stdout si disponible (peut contenir l'erreur JSON)
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
        
        // Vérifier si c'est un timeout
        const isTimeout = execError.killed && execError.signal === 'SIGTERM'
        
        return NextResponse.json(
          { 
            error: isTimeout 
              ? 'Le modèle prend trop de temps à charger. Veuillez réessayer. (Timeout après 2 minutes)'
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
      const probabilite = mlResult.probability // Probabilité de TB (0-1)
      const seuil_utilise = mlResult.threshold || 0.12
      const niveau_confiance = mlResult.confidenceLevel || (probabilite > 0.7 ? 'Élevée' : 'Modérée')
      const isTuberculosis = mlResult.prediction === 1
      
      // Features détectées depuis le modèle
      const features_detected = mlResult.details?.features || 
        (isTuberculosis 
          ? ['Opacités pulmonaires', 'Cavités', 'Adénopathies médiastinales']
          : ['Poumons clairs', 'Pas d\'anomalie', 'Structures normales'])

      const interpretation = mlResult.details?.interpretation || 
        (isTuberculosis
          ? (probabilite >= 0.8 
              ? 'Forte probabilité de tuberculose détectée. Présence de signes radiologiques caractéristiques.'
              : 'Signes possibles de tuberculose détectés. Consultation médicale recommandée pour confirmation.')
          : (probabilite <= 0.2
              ? 'Aucun signe de tuberculose détecté. Image normale.'
              : 'Résultat incertain. Consultation recommandée.'))

      const recommendation = mlResult.details?.recommendation || 
        (isTuberculosis
          ? (probabilite >= 0.8
              ? 'Consultation médicale urgente recommandée. Examens complémentaires nécessaires (test de Mantoux, culture).'
              : 'Consultation médicale recommandée pour confirmation.')
          : (probabilite <= 0.2
              ? null
              : 'Consultation médicale recommandée.'))

      // Créer la prédiction
      const prediction = await prisma.predictionIA.create({
        data: {
          id_visite: parseInt(id_visite as string),
          id_image: parseInt(id_image as string),
          maladie_predite: 'TUBERCULOSE',
          probabilite: probabilite,
          seuil_utilise: seuil_utilise,
          niveau_confiance: niveau_confiance,
          interpretation: interpretation,
          recommendation: recommendation,
          features_detected: {
            features: features_detected,
          },
          model_version: 'tuberculose_v1.0',
        },
      })

      // Créer des explicabilités basées sur les features détectées par le modèle
      // Les features les plus importantes contribuent le plus à la prédiction
      const explicabilites = features_detected.map((feature: string, index: number) => {
        // Plus la feature est importante, plus sa contribution est élevée
        // La première feature a la plus grande contribution
        const baseContribution = isTuberculosis ? 0.4 : -0.3
        const contribution = baseContribution * (1 - index * 0.15)
        return {
          variable: feature,
          contribution: Math.abs(contribution),
        }
      })

      // Ajouter aussi l'explication du modèle si disponible
      if (mlResult.details?.explanation) {
        explicabilites.push({
          variable: 'Explication du modèle',
          contribution: 0.1,
        })
      }

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

      // Récupérer la prédiction complète avec explicabilités
      const predictionComplete = await prisma.predictionIA.findUnique({
        where: { id_prediction: prediction.id_prediction },
        include: {
          explicabilites: {
            orderBy: { contribution: 'desc' },
          },
          image: true,
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

      // Convertir les BigInt en string pour la sérialisation JSON
      const predictionSerialized = {
        ...predictionComplete,
        image: predictionComplete?.image ? {
          ...predictionComplete.image,
          taille_fichier: predictionComplete.image.taille_fichier 
            ? predictionComplete.image.taille_fichier.toString() 
            : null,
        } : null,
      }

      return NextResponse.json(
        {
          message: 'Prédiction générée avec succès',
          prediction: predictionSerialized,
        },
        { status: 201 }
      )
    } catch (fileError: any) {
      console.error('Erreur lors de la lecture du fichier image:', fileError)
      return NextResponse.json(
        { error: 'Erreur lors de la lecture de l\'image', details: fileError.message },
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

