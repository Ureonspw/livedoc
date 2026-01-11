import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'

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

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10)

    // Mapper le rôle du formulaire vers le format de la base de données
    const roleMap: Record<string, 'MEDECIN' | 'INFIRMIER' | 'ADMIN'> = {
      medecin: 'MEDECIN',
      personnel: 'INFIRMIER',
      administrateur: 'ADMIN',
    }

    const dbRole = roleMap[role] || 'MEDECIN'

    // Créer l'utilisateur
    const user = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        mot_de_passe: hashedPassword,
        role: dbRole,
      },
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Inscription réussie',
        user: {
          id: user.id_utilisateur,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de l\'inscription:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'inscription',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

