import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Liste des patients avec recherche
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = search
      ? {
          OR: [
            { nom: { contains: search, mode: 'insensitive' as const } },
            { prenom: { contains: search, mode: 'insensitive' as const } },
            { telephone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { date_creation: 'desc' },
        include: {
          _count: {
            select: {
              consultations: true,
              salleAttente: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ])

    return NextResponse.json({
      patients,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des patients:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des patients' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nom, prenom, sexe, date_naissance, telephone, adresse } = body

    // Validation
    if (!nom || !prenom || !sexe || !date_naissance) {
      return NextResponse.json(
        { error: 'Nom, prénom, sexe et date de naissance sont requis' },
        { status: 400 }
      )
    }

    // Créer le patient
    const patient = await prisma.patient.create({
      data: {
        nom,
        prenom,
        sexe: sexe.toUpperCase() === 'HOMME' ? 'HOMME' : 'FEMME',
        date_naissance: new Date(date_naissance),
        telephone: telephone || null,
        adresse: adresse || null,
      },
    })

    return NextResponse.json(
      {
        message: 'Patient créé avec succès',
        patient,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de la création du patient:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du patient' },
      { status: 500 }
    )
  }
}

