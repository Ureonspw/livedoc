import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

// GET - Liste tous les utilisateurs avec filtres et pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (role && role !== 'ALL') {
      where.role = role
    }
    
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.utilisateur.findMany({
        where,
        select: {
          id_utilisateur: true,
          nom: true,
          prenom: true,
          email: true,
          role: true,
          date_creation: true,
        },
        orderBy: {
          date_creation: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.utilisateur.count({ where }),
    ])

    // Récupérer les IDs des utilisateurs
    const userIds = users.map(u => u.id_utilisateur)

    // Récupérer les dernières connexions pour tous les utilisateurs
    // Pour chaque utilisateur, récupérer le dernier log de type LOGIN
    const lastLoginLogs = userIds.length > 0 ? await Promise.all(
      userIds.map(async (userId) => {
        const lastLogin = await prisma.activityLog.findFirst({
          where: {
            id_utilisateur: userId,
            action: 'LOGIN',
          },
          orderBy: {
            date_creation: 'desc',
          },
          select: {
            date_creation: true,
          },
        })
        return { userId, lastLogin: lastLogin?.date_creation || null }
      })
    ) : []

    // Créer un map des dernières connexions par utilisateur
    const lastLoginMap = new Map<number, Date | null>()
    lastLoginLogs.forEach(({ userId, lastLogin }) => {
      if (lastLogin) {
        lastLoginMap.set(userId, lastLogin)
      }
    })

    // Associer les dernières connexions aux utilisateurs
    const usersWithLastLogin = users.map(user => ({
      ...user,
      lastLogin: lastLoginMap.get(user.id_utilisateur) || null,
    }))

    return NextResponse.json({
      users: usersWithLastLogin,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouvel utilisateur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nom, prenom, email, mot_de_passe, role } = body

    // Validation
    if (!nom || !prenom || !email || !mot_de_passe || !role) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.utilisateur.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Valider le rôle
    const validRoles = ['MEDECIN', 'INFIRMIER', 'ADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Rôle invalide' },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10)

    // Créer l'utilisateur
    const user = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        mot_de_passe: hashedPassword,
        role,
      },
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        date_creation: true,
      },
    })

    // Logger l'action
    await prisma.activityLog.create({
      data: {
        action: 'CREATE_USER',
        entity_type: 'Utilisateur',
        entity_id: user.id_utilisateur,
        details: {
          email: user.email,
          role: user.role,
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Utilisateur créé avec succès',
        user,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur', details: error.message },
      { status: 500 }
    )
  }
}
