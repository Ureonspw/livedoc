import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Liste des prescriptions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const consultation_id = searchParams.get('consultation_id')
    const medecin_id = searchParams.get('medecin_id')
    const statut = searchParams.get('statut') as 'EN_ATTENTE' | 'EN_COURS' | 'TERMINE' | null

    const where: any = {}
    if (consultation_id) {
      where.id_consultation = parseInt(consultation_id)
    }
    if (medecin_id) {
      where.id_medecin = parseInt(medecin_id)
    }
    if (statut) {
      where.statut = statut
    }

    const prescriptions = await prisma.prescriptionExamen.findMany({
      where,
      include: {
        consultation: {
          include: {
            patient: {
              select: {
                id_patient: true,
                nom: true,
                prenom: true,
                sexe: true,
                date_naissance: true,
              },
            },
          },
        },
        medecin: {
          select: {
            id_utilisateur: true,
            nom: true,
            prenom: true,
          },
        },
        resultats: {
          include: {
            photos: true,
            visite: {
              include: {
                donneesCliniques: true,
                constantesVitales: true,
                predictions: {
                  include: {
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
                    explicabilites: {
                      orderBy: { contribution: 'desc' },
                    },
                    image: true,
                  },
                  orderBy: { date_prediction: 'desc' },
                },
                images: true,
              },
            },
          },
        },
      },
      orderBy: { date_prescription: 'desc' },
    })

    // Convertir les BigInt en string et les Decimal en nombres pour la sérialisation JSON
    const prescriptionsSerialized = prescriptions.map((prescription: any) => ({
      ...prescription,
      resultats: prescription.resultats?.map((resultat: any) => {
        // Convertir les Decimal dans resultat lui-même
        const resultatSerialized: any = {};
        Object.keys(resultat).forEach((key) => {
          // Exclure les relations qui seront traitées séparément
          if (['photos', 'visite', 'prescription'].includes(key)) return;
          
          const value = resultat[key];
          if (value !== null && value !== undefined) {
            if (typeof value === 'object' && value !== null && 'toNumber' in value) {
              resultatSerialized[key] = Number(value);
            } else if (typeof value === 'string' && !isNaN(Number(value)) && value.includes('.')) {
              resultatSerialized[key] = Number(value);
            } else {
              resultatSerialized[key] = value;
            }
          } else {
            resultatSerialized[key] = value;
          }
        });
        return {
          ...resultatSerialized,
          photos: resultat.photos?.map((photo: any) => ({
            ...photo,
            taille_fichier: photo.taille_fichier ? photo.taille_fichier.toString() : null,
          })) || [],
          visite: resultat.visite ? {
            ...resultat.visite,
            images: resultat.visite.images?.map((img: any) => ({
              ...img,
              taille_fichier: img.taille_fichier ? img.taille_fichier.toString() : null,
            })) || [],
            donneesCliniques: resultat.visite.donneesCliniques ? (() => {
              const donnees: any = {};
              Object.keys(resultat.visite.donneesCliniques).forEach((key) => {
                const value = resultat.visite.donneesCliniques[key];
                if (value !== null && value !== undefined) {
                  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
                    donnees[key] = Number(value);
                  } else if (typeof value === 'string' && !isNaN(Number(value)) && value.includes('.')) {
                    donnees[key] = Number(value);
                  } else {
                    donnees[key] = value;
                  }
                } else {
                  donnees[key] = value;
                }
              });
              return donnees;
            })() : null,
            constantesVitales: resultat.visite.constantesVitales ? {
              ...resultat.visite.constantesVitales,
              temperature: resultat.visite.constantesVitales.temperature ? Number(resultat.visite.constantesVitales.temperature) : null,
              poids: resultat.visite.constantesVitales.poids ? Number(resultat.visite.constantesVitales.poids) : null,
              taille: resultat.visite.constantesVitales.taille ? Number(resultat.visite.constantesVitales.taille) : null,
            } : null,
            predictions: resultat.visite.predictions?.map((pred: any) => ({
              ...pred,
              explicabilites: pred.explicabilites || [],
              validations: pred.validations || [],
              image: pred.image ? {
                ...pred.image,
                taille_fichier: pred.image.taille_fichier ? pred.image.taille_fichier.toString() : null,
              } : null,
            })) || [],
          } : null,
        };
      }) || [],
    }))

    return NextResponse.json({ prescriptions: prescriptionsSerialized })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des prescriptions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des prescriptions' },
      { status: 500 }
    )
  }
}

// POST - Créer une prescription d'examens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_consultation, id_medecin, maladies_ciblees, commentaire } = body

    if (!id_consultation || !id_medecin || !maladies_ciblees || maladies_ciblees.length === 0) {
      return NextResponse.json(
        { error: 'Consultation, médecin et au moins une maladie cible sont requis' },
        { status: 400 }
      )
    }

    // Valider les maladies
    const maladiesValides = ['DIABETE', 'MALADIE_RENALE', 'CARDIOVASCULAIRE', 'TUBERCULOSE']
    const maladiesInvalides = maladies_ciblees.filter((m: string) => !maladiesValides.includes(m))
    if (maladiesInvalides.length > 0) {
      return NextResponse.json(
        { error: `Maladies invalides: ${maladiesInvalides.join(', ')}` },
        { status: 400 }
      )
    }

    // S'assurer que maladies_ciblees est un array
    const maladiesArray = Array.isArray(maladies_ciblees) ? maladies_ciblees : [maladies_ciblees]

    const prescription = await prisma.prescriptionExamen.create({
      data: {
        id_consultation: parseInt(id_consultation),
        id_medecin: parseInt(id_medecin),
        maladies_ciblees: maladiesArray,
        commentaire: commentaire || null,
        statut: 'EN_ATTENTE',
      },
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
    })

    return NextResponse.json(
      {
        message: 'Prescription créée avec succès',
        prescription,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de la création de la prescription:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la prescription', details: error.message },
      { status: 500 }
    )
  }
}

