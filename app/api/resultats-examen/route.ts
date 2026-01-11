import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// GET - Liste des résultats d'examens
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const prescription_id = searchParams.get('prescription_id')
    const consultation_id = searchParams.get('consultation_id')

    const where: any = {}
    if (prescription_id) {
      where.id_prescription = parseInt(prescription_id)
    }
    if (consultation_id) {
      where.prescription = {
        id_consultation: parseInt(consultation_id),
      }
    }

    const resultats = await prisma.resultatExamen.findMany({
      where,
      include: {
        prescription: {
          include: {
            consultation: {
              include: {
                patient: {
                  select: {
                    id_patient: true,
                    nom: true,
                    prenom: true,
                  },
                },
              },
            },
          },
        },
        photos: true,
        visite: {
          include: {
            predictions: {
              include: {
                validations: true,
                explicabilites: true,
              },
            },
          },
        },
      },
      orderBy: { date_saisie: 'desc' },
    })

    // Convertir les BigInt en string pour la sérialisation JSON
    const resultatsSerialized = resultats.map((resultat: any) => ({
      ...resultat,
      photos: resultat.photos?.map((photo: any) => ({
        ...photo,
        taille_fichier: photo.taille_fichier ? photo.taille_fichier.toString() : null,
      })) || [],
    }))

    return NextResponse.json({ resultats: resultatsSerialized })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des résultats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des résultats' },
      { status: 500 }
    )
  }
}

// POST - Créer un résultat d'examen (saisi par l'infirmier)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prescription_id = formData.get('prescription_id')
    const id_consultation = formData.get('id_consultation')
    const id_patient = formData.get('id_patient')
    const id_infirmier = formData.get('id_infirmier')
    const maladies_ciblees_str = formData.get('maladies_ciblees')
    const photos = formData.getAll('photos') as File[]

    console.log('Données reçues:', {
      prescription_id,
      id_consultation,
      id_patient,
      id_infirmier,
      maladies_ciblees: maladies_ciblees_str,
      photos_count: photos.length,
    })

    if (!prescription_id || !id_infirmier) {
      return NextResponse.json(
        { error: 'Prescription et infirmier sont requis' },
        { status: 400 }
      )
    }

    // Récupérer la prescription
    const prescription = await prisma.prescriptionExamen.findUnique({
      where: { id_prescription: parseInt(prescription_id as string) },
      include: {
        consultation: true,
      },
    })

    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription non trouvée' },
        { status: 404 }
      )
    }

    // Créer une nouvelle visite pour ces résultats
    const visite = await prisma.visite.create({
      data: {
        id_consultation: prescription.id_consultation,
      },
    })

    // Extraire les données cliniques du formData
    const donneesCliniques: any = {}
    const champs = [
      'nombre_grossesses', 'taux_glucose', 'pression_arterielle', 'epaisseur_pli_cutane',
      'taux_insuline', 'imc', 'fonction_pedigree_diabete', 'age',
      'uree_sanguine', 'creatinine_serique', 'sodium', 'potassium', 'hemoglobine',
      'volume_cellulaire_packe', 'globules_blancs', 'globules_rouges', 'gravite_specifique',
      'albumine', 'sucre', 'globules_rouges_urine', 'pus_cells', 'pus_cells_clumps',
      'bacteries', 'glucose_sang', 'hypertension', 'diabete_mellitus', 'maladie_coronaire',
      'appetit', 'oedeme_pieds', 'anemie',
      'cholesterol', 'pression_systolique', 'pression_diastolique', 'fumeur',
      'consommation_alcool', 'activite_physique', 'genre', 'taille_cm', 'poids_kg', 'glucose_cardio',
    ]

    champs.forEach((champ) => {
      const value = formData.get(champ)
      if (value !== null && value !== '') {
        try {
          if (champ.includes('Boolean') || champ === 'hypertension' || champ === 'diabete_mellitus' || 
              champ === 'maladie_coronaire' || champ === 'oedeme_pieds' || champ === 'anemie' ||
              champ === 'fumeur' || champ === 'consommation_alcool' || champ === 'activite_physique') {
            donneesCliniques[champ] = value === 'true' || value === '1'
          } else if (['globules_rouges_urine', 'pus_cells', 'pus_cells_clumps', 'bacteries', 'appetit', 'genre'].includes(champ)) {
            // Champs string
            donneesCliniques[champ] = value as string
          } else if (champ.includes('Int') || champ === 'age' || champ === 'nombre_grossesses' ||
                     champ === 'albumine' || champ === 'pression_systolique' || champ === 'pression_diastolique' ||
                     champ === 'glucose_cardio') {
            const intValue = parseInt(value as string)
            if (!isNaN(intValue)) {
              donneesCliniques[champ] = intValue
            }
          } else {
            // Champs numériques (Decimal)
            const floatValue = parseFloat(value as string)
            if (!isNaN(floatValue)) {
              donneesCliniques[champ] = floatValue
            }
          }
        } catch (error) {
          console.error(`Erreur lors du traitement du champ ${champ}:`, error)
        }
      }
    })

    // Créer le résultat d'examen
    const resultat = await prisma.resultatExamen.create({
      data: {
        id_prescription: parseInt(prescription_id as string),
        id_visite: visite.id_visite,
        id_infirmier: parseInt(id_infirmier as string),
        ...donneesCliniques,
      },
    })

    // Créer les données cliniques pour l'IA
    await prisma.donneesCliniquesIA.create({
      data: {
        id_visite: visite.id_visite,
        ...donneesCliniques,
      },
    })

    // Sauvegarder les photos
    const photosSauvegardees = []
    if (photos && photos.length > 0) {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'examens')
      await mkdir(uploadsDir, { recursive: true })

      for (const photo of photos) {
        if (photo.size > 0) {
          const bytes = await photo.arrayBuffer()
          const buffer = Buffer.from(bytes)
          const filename = `examen_${resultat.id_resultat}_${Date.now()}_${photo.name}`
          const filepath = join(uploadsDir, filename)

          await writeFile(filepath, buffer)

          const photoDoc = await prisma.photoDocumentExamen.create({
            data: {
              id_resultat: resultat.id_resultat,
              nom_fichier: photo.name,
              chemin_fichier: `/uploads/examens/${filename}`,
              taille_fichier: BigInt(photo.size),
              type_mime: photo.type,
            },
          })

          photosSauvegardees.push(photoDoc)

          // Si c'est une prescription pour la tuberculose, aussi enregistrer dans ImageRadiographie
          if (prescription.maladies_ciblees.includes('TUBERCULOSE')) {
            await prisma.imageRadiographie.create({
              data: {
                id_visite: visite.id_visite,
                nom_fichier: photo.name,
                chemin_fichier: `/uploads/examens/${filename}`,
                taille_fichier: BigInt(photo.size),
                type_mime: photo.type,
              },
            })
          }
        }
      }
    }

    // Mettre à jour le statut de la prescription
    await prisma.prescriptionExamen.update({
      where: { id_prescription: parseInt(prescription_id as string) },
      data: { statut: 'EN_COURS' },
    })

    // Convertir les BigInt en string pour la sérialisation JSON
    const photosSerialized = photosSauvegardees.map((photo: any) => ({
      ...photo,
      taille_fichier: photo.taille_fichier ? photo.taille_fichier.toString() : null,
    }))

    return NextResponse.json(
      {
        message: 'Résultats d\'examen enregistrés avec succès',
        resultat: {
          ...resultat,
          photos: photosSerialized,
        },
        visite: {
          id_visite: visite.id_visite,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de l\'enregistrement des résultats:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'enregistrement des résultats', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

