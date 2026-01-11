import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Créer des données cliniques pour une visite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_visite, ...donnees } = body

    if (!id_visite) {
      return NextResponse.json(
        { error: 'ID visite requis' },
        { status: 400 }
      )
    }

    // Vérifier si la visite existe
    const visite = await prisma.visite.findUnique({
      where: { id_visite },
    })

    if (!visite) {
      return NextResponse.json(
        { error: 'Visite non trouvée' },
        { status: 404 }
      )
    }

    // Préparer les données pour la base
    const donneesCliniques = {
      id_visite,
      // Diabète
      nombre_grossesses: donnees.nombre_grossesses ? parseInt(donnees.nombre_grossesses) : null,
      taux_glucose: donnees.taux_glucose ? parseFloat(donnees.taux_glucose) : null,
      pression_arterielle: donnees.pression_arterielle ? parseFloat(donnees.pression_arterielle) : null,
      epaisseur_pli_cutane: donnees.epaisseur_pli_cutane ? parseFloat(donnees.epaisseur_pli_cutane) : null,
      taux_insuline: donnees.taux_insuline ? parseFloat(donnees.taux_insuline) : null,
      imc: donnees.imc ? parseFloat(donnees.imc) : null,
      fonction_pedigree_diabete: donnees.fonction_pedigree_diabete ? parseFloat(donnees.fonction_pedigree_diabete) : null,
      age: donnees.age ? parseInt(donnees.age) : null,
      // Maladie rénale
      uree_sanguine: donnees.uree_sanguine ? parseFloat(donnees.uree_sanguine) : null,
      creatinine_serique: donnees.creatinine_serique ? parseFloat(donnees.creatinine_serique) : null,
      sodium: donnees.sodium ? parseFloat(donnees.sodium) : null,
      potassium: donnees.potassium ? parseFloat(donnees.potassium) : null,
      hemoglobine: donnees.hemoglobine ? parseFloat(donnees.hemoglobine) : null,
      volume_cellulaire_packe: donnees.volume_cellulaire_packe ? parseFloat(donnees.volume_cellulaire_packe) : null,
      globules_blancs: donnees.globules_blancs ? parseFloat(donnees.globules_blancs) : null,
      globules_rouges: donnees.globules_rouges ? parseFloat(donnees.globules_rouges) : null,
      gravite_specifique: donnees.gravite_specifique ? parseFloat(donnees.gravite_specifique) : null,
      albumine: donnees.albumine ? parseInt(donnees.albumine) : null,
      sucre: donnees.sucre ? parseFloat(donnees.sucre) : null,
      globules_rouges_urine: donnees.globules_rouges_urine || null,
      pus_cells: donnees.pus_cells || null,
      pus_cells_clumps: donnees.pus_cells_clumps || null,
      bacteries: donnees.bacteries || null,
      glucose_sang: donnees.glucose_sang ? parseFloat(donnees.glucose_sang) : null,
      hypertension: donnees.hypertension === true || donnees.hypertension === 'true' || null,
      diabete_mellitus: donnees.diabete_mellitus === true || donnees.diabete_mellitus === 'true' || null,
      maladie_coronaire: donnees.maladie_coronaire === true || donnees.maladie_coronaire === 'true' || null,
      appetit: donnees.appetit || null,
      oedeme_pieds: donnees.oedeme_pieds === true || donnees.oedeme_pieds === 'true' || null,
      anemie: donnees.anemie === true || donnees.anemie === 'true' || null,
      // Cardiovasculaire
      cholesterol: donnees.cholesterol ? parseFloat(donnees.cholesterol) : null,
      pression_systolique: donnees.pression_systolique ? parseInt(donnees.pression_systolique) : null,
      pression_diastolique: donnees.pression_diastolique ? parseInt(donnees.pression_diastolique) : null,
      fumeur: donnees.fumeur === true || donnees.fumeur === 'true' || null,
      consommation_alcool: donnees.consommation_alcool === true || donnees.consommation_alcool === 'true' || null,
      activite_physique: donnees.activite_physique === true || donnees.activite_physique === 'true' || null,
      genre: donnees.genre ? (donnees.genre.toUpperCase() === 'HOMME' ? 'HOMME' : 'FEMME') : null,
      taille_cm: donnees.taille_cm ? parseFloat(donnees.taille_cm) : null,
      poids_kg: donnees.poids_kg ? parseFloat(donnees.poids_kg) : null,
      glucose_cardio: donnees.glucose_cardio ? parseInt(donnees.glucose_cardio) : null,
    }

    // Créer ou mettre à jour les données cliniques
    const donneesIA = await prisma.donneesCliniquesIA.upsert({
      where: { id_visite },
      update: donneesCliniques,
      create: donneesCliniques,
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

    return NextResponse.json(
      {
        message: 'Données cliniques enregistrées',
        donneesCliniques: donneesIA,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de l\'enregistrement des données cliniques:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement des données cliniques', details: error.message },
      { status: 500 }
    )
  }
}

