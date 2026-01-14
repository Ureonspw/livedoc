import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Créer une validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_prediction, id_medecin, validation_status, commentaire, diagnostic_final } = body

    if (!id_prediction || !id_medecin || !validation_status) {
      return NextResponse.json(
        { error: 'ID prédiction, ID médecin et statut de validation requis' },
        { status: 400 }
      )
    }

    if (!['VALIDE', 'REJETE', 'MODIFIE', 'EN_ATTENTE'].includes(validation_status)) {
      return NextResponse.json(
        { error: 'Statut de validation invalide' },
        { status: 400 }
      )
    }

    const validation = await prisma.validation.create({
      data: {
        id_prediction: parseInt(id_prediction),
        id_medecin: parseInt(id_medecin),
        validation_status: validation_status as 'VALIDE' | 'REJETE' | 'MODIFIE' | 'EN_ATTENTE',
        commentaire: commentaire || null,
        diagnostic_final: diagnostic_final || null,
      },
      include: {
        prediction: {
          include: {
            visite: {
              include: {
                consultation: {
                  include: {
                    patient: true,
                  },
                },
              },
            },
          },
        },
        medecin: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
    })

    // Mettre à jour le statut de la prescription si toutes les prédictions sont validées
    try {
      // Attendre un peu pour s'assurer que la validation est bien sauvegardée dans la base de données
      await new Promise(resolve => setTimeout(resolve, 100))
      // Récupérer la visite de la prédiction avec toutes les informations nécessaires
      // Inclure aussi la validation que nous venons de créer
      const prediction = await prisma.predictionIA.findUnique({
        where: { id_prediction: parseInt(id_prediction) },
        include: {
          visite: {
            include: {
              consultation: true,
            },
          },
          validations: {
            orderBy: { date_validation: 'desc' },
          },
        },
      })

      if (prediction && prediction.visite) {
        // Trouver la prescription associée à cette visite via le résultat d'examen
        const resultatExamen = await prisma.resultatExamen.findFirst({
          where: { id_visite: prediction.visite.id_visite },
          include: {
            prescription: true,
          },
        })

        if (resultatExamen && resultatExamen.prescription) {
          const prescription = resultatExamen.prescription
          
          // Récupérer toutes les validations de toutes les prédictions de cette prescription
          // pour s'assurer que nous avons les données les plus récentes
          const toutesLesValidations = await prisma.validation.findMany({
            where: {
              prediction: {
                visite: {
                  resultatsExamen: {
                    some: {
                      id_prescription: prescription.id_prescription,
                    },
                  },
                },
              },
            },
            include: {
              prediction: true,
            },
            orderBy: { date_validation: 'desc' },
          })
          console.log(`Total validations trouvées pour prescription ${prescription.id_prescription}:`, toutesLesValidations.length)

          // Récupérer tous les résultats de cette prescription avec leurs prédictions
          const tousLesResultats = await prisma.resultatExamen.findMany({
            where: { id_prescription: prescription.id_prescription },
            include: {
              visite: {
                include: {
                  predictions: {
                    include: {
                      validations: {
                        orderBy: { date_validation: 'desc' },
                      },
                    },
                  },
                },
              },
            },
          })

          // Vérifier si toutes les prédictions ont été validées
          let toutesValidees = true
          let hasAnyPrediction = false
          let totalPredictions = 0
          let validatedPredictions = 0
          
          for (const resultat of tousLesResultats) {
            if (resultat.visite && resultat.visite.predictions && resultat.visite.predictions.length > 0) {
              hasAnyPrediction = true
              for (const pred of resultat.visite.predictions) {
                totalPredictions++
                
                // Récupérer toutes les validations pour cette prédiction depuis la liste complète
                let validationsToCheck = toutesLesValidations
                  .filter((v: any) => v.prediction.id_prediction === pred.id_prediction)
                  .map((v: any) => ({
                    id_validation: v.id_validation,
                    validation_status: v.validation_status,
                    commentaire: v.commentaire,
                    diagnostic_final: v.diagnostic_final,
                  }))
                
                // Si c'est la prédiction que nous venons de valider, s'assurer que notre validation est incluse
                if (pred.id_prediction === parseInt(id_prediction)) {
                  const validationExists = validationsToCheck.some((v: any) => v.id_validation === validation.id_validation)
                  if (!validationExists) {
                    validationsToCheck.push({
                      id_validation: validation.id_validation,
                      validation_status: validation.validation_status,
                      commentaire: validation.commentaire,
                      diagnostic_final: validation.diagnostic_final,
                    })
                    console.log(`  → Ajout de la validation ${validation.id_validation} (${validation.validation_status}) à la prédiction ${pred.id_prediction}`)
                  } else {
                    console.log(`  → Validation ${validation.id_validation} déjà présente pour la prédiction ${pred.id_prediction}`)
                  }
                }
                
                // Vérifier si la prédiction a au moins une validation avec un statut définitif
                const hasDefinitiveValidation = validationsToCheck.length > 0 && 
                  validationsToCheck.some((v: any) => ['VALIDE', 'REJETE', 'MODIFIE'].includes(v.validation_status))
                
                console.log(`  → Prédiction ${pred.id_prediction}: ${validationsToCheck.length} validation(s), hasDefinitiveValidation: ${hasDefinitiveValidation}`)
                
                if (hasDefinitiveValidation) {
                  validatedPredictions++
                } else {
                  toutesValidees = false
                }
              }
            }
          }

          console.log(`Prescription ${prescription.id_prescription}: ${validatedPredictions}/${totalPredictions} prédictions validées, toutesValidees: ${toutesValidees}, hasAnyPrediction: ${hasAnyPrediction}`)

          // Si toutes les prédictions sont validées ET qu'il y a au moins une prédiction, mettre la prescription à TERMINE
          if (hasAnyPrediction && toutesValidees && totalPredictions > 0) {
            const updated = await prisma.prescriptionExamen.update({
              where: { id_prescription: prescription.id_prescription },
              data: { statut: 'TERMINE' },
            })
            console.log(`✅ Prescription ${prescription.id_prescription} mise à jour à TERMINE (statut: ${updated.statut})`)
          } else if (!hasAnyPrediction) {
            console.log(`⚠️ Prescription ${prescription.id_prescription}: Aucune prédiction trouvée`)
          } else if (!toutesValidees) {
            console.log(`⚠️ Prescription ${prescription.id_prescription}: Pas toutes les prédictions sont validées (${validatedPredictions}/${totalPredictions})`)
            // Afficher les détails pour déboguer
            for (const resultat of tousLesResultats) {
              if (resultat.visite && resultat.visite.predictions) {
                for (const pred of resultat.visite.predictions) {
                  const validations = pred.validations || []
                  console.log(`  - Prédiction ${pred.id_prediction}: ${validations.length} validation(s)`)
                  validations.forEach((v: any) => {
                    console.log(`    * Validation ${v.id_validation}: ${v.validation_status}`)
                  })
                }
              }
            }
          }
        } else {
          console.log(`⚠️ Aucun résultat d'examen trouvé pour la visite ${prediction.visite.id_visite}`)
        }
      } else {
        console.log(`⚠️ Prédiction ${id_prediction} ou visite non trouvée`)
      }
    } catch (updateError: any) {
      // Ne pas faire échouer la validation si la mise à jour du statut échoue
      console.error('Erreur lors de la mise à jour du statut de la prescription:', updateError)
      console.error('Stack:', updateError.stack)
    }

    // Si la validation est VALIDE, créer automatiquement un suivi médical
    let suiviCree = null
    if (validation_status === 'VALIDE' && validation.prediction) {
      try {
        console.log('🔍 Tentative de création de suivi médical...')
        console.log('Validation:', {
          id_validation: validation.id_validation,
          id_prediction: validation.prediction.id_prediction,
          maladie: validation.prediction.maladie_predite,
        })

        const patient = validation.prediction.visite?.consultation?.patient
        console.log('Patient trouvé:', patient ? { id: patient.id_patient, nom: patient.nom, prenom: patient.prenom } : 'NON TROUVÉ')
        
        if (!patient) {
          console.error('❌ Patient non trouvé dans la validation')
          // Essayer de récupérer le patient depuis la prédiction
          const predictionComplete = await prisma.predictionIA.findUnique({
            where: { id_prediction: validation.prediction.id_prediction },
            include: {
              visite: {
                include: {
                  consultation: {
                    include: {
                      patient: true,
                    },
                  },
                },
              },
            },
          })
          
          if (predictionComplete?.visite?.consultation?.patient) {
            const patientRecupere = predictionComplete.visite.consultation.patient
            console.log('✅ Patient récupéré:', { id: patientRecupere.id_patient, nom: patientRecupere.nom })
            
            // Vérifier si un suivi existe déjà
            const suiviExistant = await prisma.suiviMedical.findFirst({
              where: {
                id_patient: patientRecupere.id_patient,
                maladie_predite: validation.prediction.maladie_predite,
                statut_suivi: {
                  not: 'GUERI',
                },
              },
            })

            if (!suiviExistant) {
              // Créer le suivi médical
              suiviCree = await prisma.suiviMedical.create({
                data: {
                  id_patient: patientRecupere.id_patient,
                  id_medecin: parseInt(id_medecin),
                  id_prediction_initiale: validation.prediction.id_prediction,
                  maladie_predite: validation.prediction.maladie_predite,
                  traitement: commentaire || null,
                  recommandations: diagnostic_final || null,
                  statut_suivi: 'EN_COURS',
                },
              })
              console.log(`✅ Suivi médical créé automatiquement pour le patient ${patientRecupere.id_patient} (${validation.prediction.maladie_predite})`)
            } else {
              console.log(`⚠️ Un suivi existe déjà pour ce patient et cette maladie (ID: ${suiviExistant.id_suivi})`)
            }
          }
        } else {
          // Vérifier si un suivi existe déjà pour ce patient et cette maladie
          const suiviExistant = await prisma.suiviMedical.findFirst({
            where: {
              id_patient: patient.id_patient,
              maladie_predite: validation.prediction.maladie_predite,
              statut_suivi: {
                not: 'GUERI',
              },
            },
          })

          if (!suiviExistant) {
            const dataSuivi = {
              id_patient: patient.id_patient,
              id_medecin: parseInt(id_medecin),
              id_prediction_initiale: validation.prediction.id_prediction,
              maladie_predite: validation.prediction.maladie_predite,
              traitement: commentaire || null,
              recommandations: diagnostic_final || null,
              statut_suivi: 'EN_COURS' as const,
            }
            
            console.log('📝 Création du suivi médical avec les données:', dataSuivi)
            
            // Créer le suivi médical
            try {
              suiviCree = await prisma.suiviMedical.create({
                data: dataSuivi,
              })
              console.log(`✅✅✅ Suivi médical créé avec succès! ID: ${suiviCree.id_suivi}, Patient: ${patient.id_patient}, Médecin: ${id_medecin}, Maladie: ${validation.prediction.maladie_predite}`)
              
              // Vérifier immédiatement que le suivi existe
              const verification = await prisma.suiviMedical.findUnique({
                where: { id_suivi: suiviCree.id_suivi },
              })
              console.log('✅ Vérification: Suivi trouvé dans la BDD:', !!verification)
            } catch (createError: any) {
              console.error('❌❌❌ ERREUR lors de la création du suivi:', createError)
              console.error('Message:', createError.message)
              console.error('Code:', createError.code)
              console.error('Stack:', createError.stack)
              throw createError // Re-lancer pour que l'erreur soit visible
            }
          } else {
            console.log(`⚠️ Un suivi existe déjà pour ce patient et cette maladie (ID: ${suiviExistant.id_suivi}, Médecin: ${suiviExistant.id_medecin})`)
          }
        }
      } catch (suiviError: any) {
        // Ne pas faire échouer la validation si la création du suivi échoue
        // MAIS logger l'erreur de manière très visible
        console.error('❌❌❌ ERREUR CRITIQUE lors de la création automatique du suivi médical ❌❌❌')
        console.error('Message:', suiviError.message)
        console.error('Code:', suiviError.code)
        console.error('Stack:', suiviError.stack)
        console.error('Données qui ont échoué:', {
          id_medecin: id_medecin,
          id_prediction: validation.prediction?.id_prediction,
          maladie: validation.prediction?.maladie_predite,
        })
        
        // Retourner quand même la validation mais avec un avertissement
        return NextResponse.json(
          {
            message: 'Validation enregistrée MAIS le suivi médical n\'a pas pu être créé automatiquement',
            validation,
            suiviCree: null,
            erreurSuivi: process.env.NODE_ENV === 'development' ? {
              message: suiviError.message,
              code: suiviError.code,
            } : undefined,
          },
          { status: 201 }
        )
      }
    } else {
      console.log('⚠️ Pas de création de suivi - validation_status:', validation_status, 'prediction:', !!validation.prediction)
    }

    return NextResponse.json(
      {
        message: 'Validation enregistrée',
        validation,
        suiviCree: suiviCree ? { id_suivi: suiviCree.id_suivi } : null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de la création de la validation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la validation' },
      { status: 500 }
    )
  }
}

// GET - Liste des validations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const medecin_id = searchParams.get('medecin_id')
    const prediction_id = searchParams.get('prediction_id')

    const where: any = {}
    if (medecin_id) {
      where.id_medecin = parseInt(medecin_id)
    }
    if (prediction_id) {
      where.id_prediction = parseInt(prediction_id)
    }

    const validations = await prisma.validation.findMany({
      where,
      include: {
        prediction: {
          include: {
            visite: {
              include: {
                consultation: {
                  include: {
                    patient: true,
                  },
                },
              },
            },
          },
        },
        medecin: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
      orderBy: { date_validation: 'desc' },
    })

    return NextResponse.json({ validations })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des validations:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des validations' },
      { status: 500 }
    )
  }
}

