import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, mot_de_passe } = body

    // Validation
    if (!email || !mot_de_passe) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Trouver l'utilisateur
    const user = await prisma.utilisateur.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Créer le token JWT
    const token = await new SignJWT({
      id: user.id_utilisateur,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    // Déterminer la route de redirection selon le rôle
    const redirectPath = getRedirectPath(user.role)

    // Récupérer l'adresse IP du client
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || 
                     'unknown'

    // Créer un log d'activité pour la connexion
    try {
      await prisma.activityLog.create({
        data: {
          id_utilisateur: user.id_utilisateur,
          action: 'LOGIN',
          entity_type: 'Utilisateur',
          entity_id: user.id_utilisateur,
          ip_address: ipAddress,
          details: {
            email: user.email,
            role: user.role,
            redirectPath,
          },
        },
      })
    } catch (logError) {
      // Ne pas faire échouer la connexion si le log échoue
      console.error('Erreur lors de la création du log de connexion:', logError)
    }

    // Créer la réponse avec le cookie
    const response = NextResponse.json(
      {
        message: 'Connexion réussie',
        user: {
          id: user.id_utilisateur,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
        },
        redirectPath,
      },
      { status: 200 }
    )

    // Définir le cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Erreur lors de la connexion:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la connexion',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

function getRedirectPath(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboardadmin'
    case 'INFIRMIER':
      return '/dashboardinfirmier'
    case 'MEDECIN':
    default:
      return '/dashboard'
  }
}

