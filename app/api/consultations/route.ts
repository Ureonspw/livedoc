import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Liste des consultations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const patient_id = searchParams.get('patient_id')
    const medecin_id = searchParams.get('medecin_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (patient_id) {
      where.id_patient = parseInt(patient_id)
    }
    if (medecin_id && medecin_id !== 'undefined') {
      where.id_medecin = parseInt(medecin_id)
    }

    const consultations = await prisma.consultation.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { date_consultation: 'desc' },
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
        medecin: {
          select: {
            id_utilisateur: true,
            nom: true,
            prenom: true,
          },
        },
        visites: {
          include: {
            constantesVitales: true,
            donneesCliniques: true,
            predictions: {
              include: {
                explicabilites: true,
                validations: {
                  include: {
                    medecin: {
                      select: {
                        nom: true,
                        prenom: true,
                      },
                    },
                  },
                },
              },
              orderBy: { date_prediction: 'desc' },
            },
          },
          orderBy: { date_visite: 'desc' },
        },
      },
    })

    // Convertir les Decimal en nombres pour la sérialisation JSON
    const consultationsSerialized = consultations.map((consultation: any) => ({
      ...consultation,
      visites: consultation.visites?.map((visite: any) => ({
        ...visite,
        constantesVitales: visite.constantesVitales ? {
          ...visite.constantesVitales,
          temperature: visite.constantesVitales.temperature ? Number(visite.constantesVitales.temperature) : null,
          poids: visite.constantesVitales.poids ? Number(visite.constantesVitales.poids) : null,
          taille: visite.constantesVitales.taille ? Number(visite.constantesVitales.taille) : null,
        } : null,
        donneesCliniques: visite.donneesCliniques ? (() => {
          const donnees: any = {};
          Object.keys(visite.donneesCliniques).forEach((key) => {
            const value = visite.donneesCliniques[key];
            if (value !== null && value !== undefined) {
              // Convertir les Decimal en nombres
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
      })) || [],
    }));

    return NextResponse.json({ consultations: consultationsSerialized })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des consultations:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des consultations' },
      { status: 500 }
    )
  }
}

// POST - Créer une consultation et une visite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_patient, id_medecin, motif } = body

    if (!id_patient) {
      return NextResponse.json(
        { error: 'ID patient requis' },
        { status: 400 }
      )
    }

    if (!id_medecin) {
      return NextResponse.json(
        { error: 'ID médecin requis. Veuillez sélectionner un médecin.' },
        { status: 400 }
      )
    }

    // Vérifier que le médecin existe et est bien un médecin
    const medecin = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: id_medecin },
    });

    if (!medecin) {
      return NextResponse.json(
        { error: 'Médecin non trouvé' },
        { status: 404 }
      )
    }

    if (medecin.role !== 'MEDECIN' && medecin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'L\'utilisateur sélectionné n\'est pas un médecin' },
        { status: 400 }
      )
    }

    const medecinId = id_medecin;

    // Créer la consultation
    const consultation = await prisma.consultation.create({
      data: {
        id_patient,
        id_medecin: medecinId,
        motif: motif || null,
      },
      include: {
        patient: true,
      },
    })

    // Créer la visite associée
    const visite = await prisma.visite.create({
      data: {
        id_consultation: consultation.id_consultation,
      },
      include: {
        consultation: {
          include: {
            patient: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Consultation et visite créées',
        consultation,
        visite,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de la création de la consultation:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de la consultation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
