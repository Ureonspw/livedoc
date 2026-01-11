import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'

// GET - Récupérer un utilisateur spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    
    if (!idParam || isNaN(Number(idParam))) {
      return NextResponse.json(
        { error: 'ID utilisateur invalide' },
        { status: 400 }
      )
    }
    
    const id = parseInt(idParam, 10)

    const user = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: id },
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        date_creation: true,
        consultations: {
          select: {
            id_consultation: true,
            date_consultation: true,
          },
          orderBy: {
            date_consultation: 'desc',
          },
          take: 5,
        },
        activityLogs: {
          select: {
            action: true,
            entity_type: true,
            date_creation: true,
          },
          orderBy: {
            date_creation: 'desc',
          },
          take: 10,
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un utilisateur
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    
    if (!idParam || isNaN(Number(idParam))) {
      return NextResponse.json(
        { error: 'ID utilisateur invalide' },
        { status: 400 }
      )
    }
    
    const id = parseInt(idParam, 10)
    const body = await request.json()
    const { nom, prenom, email, mot_de_passe, role } = body

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Préparer les données de mise à jour
    const updateData: any = {}
    
    if (nom) updateData.nom = nom
    if (prenom) updateData.prenom = prenom
    if (email) {
      // Vérifier si l'email n'est pas déjà utilisé par un autre utilisateur
      const emailExists = await prisma.utilisateur.findFirst({
        where: {
          email,
          id_utilisateur: { not: id },
        },
      })
      
      if (emailExists) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé par un autre utilisateur' },
          { status: 400 }
        )
      }
      
      updateData.email = email
    }
    
    if (role) {
      const validRoles = ['MEDECIN', 'INFIRMIER', 'ADMIN']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Rôle invalide' },
          { status: 400 }
        )
      }
      updateData.role = role
    }
    
    if (mot_de_passe) {
      updateData.mot_de_passe = await bcrypt.hash(mot_de_passe, 10)
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.utilisateur.update({
      where: { id_utilisateur: id },
      data: updateData,
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
        action: 'UPDATE_USER',
        entity_type: 'Utilisateur',
        entity_id: id,
        details: {
          updatedFields: Object.keys(updateData),
        },
      },
    })

    return NextResponse.json({
      message: 'Utilisateur mis à jour avec succès',
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    
    if (!idParam || isNaN(Number(idParam))) {
      return NextResponse.json(
        { error: 'ID utilisateur invalide' },
        { status: 400 }
      )
    }
    
    const id = parseInt(idParam, 10)

    // Vérifier que l'utilisateur existe
    const user = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: id },
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier les relations qui empêchent la suppression (RESTRICT)
    // Ces relations ont onDelete: RESTRICT dans le schéma
    const errors: string[] = []
    
    // Vérifier les consultations (RESTRICT)
    const consultationsCount = await prisma.consultation.count({
      where: { id_medecin: id },
    })
    if (consultationsCount > 0) {
      errors.push(`${consultationsCount} consultation(s)`)
    }
    
    // Vérifier les validations (RESTRICT)
    const validationsCount = await prisma.validation.count({
      where: { id_medecin: id },
    })
    if (validationsCount > 0) {
      errors.push(`${validationsCount} validation(s)`)
    }
    
    // Vérifier les prescriptions d'examen (RESTRICT par défaut)
    const prescriptionsCount = await prisma.prescriptionExamen.count({
      where: { id_medecin: id },
    })
    if (prescriptionsCount > 0) {
      errors.push(`${prescriptionsCount} prescription(s) d'examen`)
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Impossible de supprimer cet utilisateur car il est associé à des données :',
          details: errors.join(', '),
          cannotDelete: true,
        },
        { status: 400 }
      )
    }

    // Sauvegarder les informations de l'utilisateur avant suppression pour le log
    const userInfo = {
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    }

    // Supprimer l'utilisateur
    await prisma.utilisateur.delete({
      where: { id_utilisateur: id },
    })

    // Logger l'action (sans id_utilisateur car l'utilisateur n'existe plus)
    try {
      await prisma.activityLog.create({
        data: {
          action: 'DELETE_USER',
          entity_type: 'Utilisateur',
          entity_id: id,
          details: userInfo,
        },
      })
    } catch (logError) {
      // Ne pas faire échouer la suppression si le log échoue
      console.error('Erreur lors de la création du log de suppression:', logError)
    }

    return NextResponse.json({
      message: 'Utilisateur supprimé avec succès',
    })
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error)
    
    // Gérer les erreurs de contrainte de clé étrangère
    if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
      return NextResponse.json(
        { 
          error: 'Impossible de supprimer cet utilisateur car il est associé à des données dans le système.',
          details: 'Cet utilisateur a des consultations, validations ou prescriptions liées.',
          cannotDelete: true,
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur', details: error.message },
      { status: 500 }
    )
  }
}
