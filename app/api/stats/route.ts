import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const medecin_id = searchParams.get('medecin_id')

    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)

    // Construire le where pour filtrer par médecin si fourni
    const whereConsultations: any = {
      date_consultation: {
        gte: startOfWeek,
      },
    }
    if (medecin_id && medecin_id !== 'undefined') {
      whereConsultations.id_medecin = parseInt(medecin_id)
    }

    // Récupérer toutes les consultations et les grouper manuellement par date (car groupBy groupe par date/heure exacte)
    const allConsultations = await prisma.consultation.findMany({
      where: whereConsultations,
      select: {
        id_consultation: true,
        date_consultation: true,
      },
    })
    
    // Grouper manuellement par date (sans l'heure)
    const consultationsParJourMap = new Map<string, number>()
    allConsultations.forEach(consultation => {
      const date = new Date(consultation.date_consultation)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]
      consultationsParJourMap.set(dateStr, (consultationsParJourMap.get(dateStr) || 0) + 1)
    })
    
    // Convertir en format attendu
    const consultationsParJour = Array.from(consultationsParJourMap.entries()).map(([date_consultation, count]) => ({
      date_consultation: new Date(date_consultation),
      _count: { id_consultation: count }
    }))

    // Répartition par statut (filtrée par médecin si fourni)
    const whereSalleAttente: any = {}
    if (medecin_id && medecin_id !== 'undefined') {
      // Récupérer les patients des consultations de ce médecin
      const consultationsMedecin = await prisma.consultation.findMany({
        where: { id_medecin: parseInt(medecin_id) },
        select: { id_patient: true },
      })
      const patientIds = consultationsMedecin.map(c => c.id_patient)
      if (patientIds.length > 0) {
        whereSalleAttente.id_patient = { in: patientIds }
      } else {
        // Si le médecin n'a pas de consultations, retourner des zéros
        whereSalleAttente.id_patient = { in: [-1] } // ID qui n'existe pas
      }
    }
    
    const repartitionStatut = await prisma.salleAttente.groupBy({
      by: ['statut'],
      where: Object.keys(whereSalleAttente).length > 0 ? whereSalleAttente : undefined,
      _count: {
        id_salle_attente: true,
      },
    })

    // Patients enregistrés par jour (filtrés par médecin si fourni - patients vus par ce médecin)
    const wherePatients: any = {
      date_creation: {
        gte: startOfWeek,
      },
    }
    if (medecin_id && medecin_id !== 'undefined') {
      // Récupérer les patients des consultations de ce médecin
      const consultationsMedecin = await prisma.consultation.findMany({
        where: { id_medecin: parseInt(medecin_id) },
        select: { id_patient: true },
        distinct: ['id_patient'],
      })
      const patientIds = consultationsMedecin.map(c => c.id_patient)
      if (patientIds.length > 0) {
        wherePatients.id_patient = { in: patientIds }
      } else {
        wherePatients.id_patient = { in: [-1] } // ID qui n'existe pas
      }
    }
    
    // Récupérer tous les patients et les grouper manuellement par date (car groupBy groupe par date/heure exacte)
    const allPatients = await prisma.patient.findMany({
      where: wherePatients,
      select: {
        id_patient: true,
        date_creation: true,
      },
    })
    
    // Grouper manuellement par date (sans l'heure)
    const patientsParJourMap = new Map<string, number>()
    allPatients.forEach(patient => {
      const date = new Date(patient.date_creation)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]
      patientsParJourMap.set(dateStr, (patientsParJourMap.get(dateStr) || 0) + 1)
    })
    
    // Convertir en format attendu
    const patientsParJour = Array.from(patientsParJourMap.entries()).map(([date_creation, count]) => ({
      date_creation: new Date(date_creation),
      _count: { id_patient: count }
    }))

    // Constantes vitales moyennes (filtrées par médecin si fourni)
    const whereConstantes: any = {
      visite: {
        consultation: {
          date_consultation: {
            gte: startOfWeek,
          },
        },
      },
    }
    if (medecin_id && medecin_id !== 'undefined') {
      whereConstantes.visite.consultation.id_medecin = parseInt(medecin_id)
    }
    
    const constantesMoyennes = await prisma.constantesVitales.aggregate({
      _avg: {
        temperature: true,
        frequence_cardiaque: true,
        saturation_oxygene: true,
        poids: true,
        taille: true,
      },
      where: whereConstantes,
    })

    // Récupérer le total de tous les patients (pour le dashboard)
    const totalPatients = await prisma.patient.count({})

    // Préparer les données pour les graphiques - 7 derniers jours à partir d'aujourd'hui
    const nomsJours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    
    // Créer un tableau des 7 derniers jours (du plus ancien au plus récent)
    const joursData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const jourSemaine = date.getDay() // 0 = Dimanche, 1 = Lundi, etc.
      joursData.push({
        date: date,
        dateStr: date.toISOString().split('T')[0],
        jour: nomsJours[jourSemaine],
        jourIndex: jourSemaine
      })
    }

    const consultationsData = joursData.map(({ jour, dateStr }) => {
      const count = consultationsParJour.find(
        c => {
          const cDate = new Date(c.date_consultation)
          cDate.setHours(0, 0, 0, 0)
          return cDate.toISOString().split('T')[0] === dateStr
        }
      )?._count.id_consultation || 0
      return { jour, count }
    })

    const patientsData = joursData.map(({ jour, dateStr }) => {
      const count = patientsParJour.find(
        p => {
          const pDate = new Date(p.date_creation)
          pDate.setHours(0, 0, 0, 0)
          return pDate.toISOString().split('T')[0] === dateStr
        }
      )?._count.id_patient || 0
      return { jour, count }
    })

    const statutData = {
      EN_ATTENTE: repartitionStatut.find(s => s.statut === 'EN_ATTENTE')?._count.id_salle_attente || 0,
      EN_CONSULTATION: repartitionStatut.find(s => s.statut === 'EN_CONSULTATION')?._count.id_salle_attente || 0,
      TERMINE: repartitionStatut.find(s => s.statut === 'TERMINE')?._count.id_salle_attente || 0,
    }

    // Convertir les Decimal en nombres pour la sérialisation JSON
    const constantesMoyennesSerialized = {
      temperature: constantesMoyennes._avg.temperature ? Number(constantesMoyennes._avg.temperature) : 0,
      frequence_cardiaque: constantesMoyennes._avg.frequence_cardiaque ? Number(constantesMoyennes._avg.frequence_cardiaque) : 0,
      saturation_oxygene: constantesMoyennes._avg.saturation_oxygene ? Number(constantesMoyennes._avg.saturation_oxygene) : 0,
      poids: constantesMoyennes._avg.poids ? Number(constantesMoyennes._avg.poids) : 0,
      taille: constantesMoyennes._avg.taille ? Number(constantesMoyennes._avg.taille) : 0,
    }

    return NextResponse.json({
      consultationsParJour: consultationsData,
      patientsParJour: patientsData,
      repartitionStatut: statutData,
      constantesMoyennes: constantesMoyennesSerialized,
      totalPatients: totalPatients,
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}

