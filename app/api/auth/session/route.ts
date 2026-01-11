import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Vérifier le token
    const { payload } = await jwtVerify(token, secret)

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: payload.id as number },
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error('Erreur lors de la vérification de la session:', error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ message: 'Déconnexion réussie' })
  response.cookies.delete('auth-token')
  return response
}

