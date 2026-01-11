import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucune image fournie' },
        { status: 400 }
      );
    }

    // Créer un dossier temporaire pour les images
    const tempDir = join(process.cwd(), 'temp');
    const tempFilePath = join(tempDir, `temp_${Date.now()}_${file.name}`);
    
    // Créer le dossier s'il n'existe pas
    try {
      await execAsync(`mkdir -p ${tempDir}`);
    } catch (error) {
      // Le dossier existe peut-être déjà
    }

    // Sauvegarder le fichier temporairement
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempFilePath, buffer);

    // Chemin vers le script Python
    const scriptPath = join(process.cwd(), 'scripts', 'predict.py');
    const modelPath = join(process.cwd(), 'public', 'models', 'app_model');

    // Exécuter le script Python avec timeout
    let stdout = '';
    let stderr = '';
    
    try {
      const result = await execAsync(
        `python3 "${scriptPath}" "${tempFilePath}" "${modelPath}"`,
        { 
          timeout: 30000, // 30 secondes timeout
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }
      );
      stdout = result.stdout;
      stderr = result.stderr || '';
    } catch (execError: any) {
      // Nettoyer le fichier temporaire même en cas d'erreur
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        // Ignorer les erreurs de suppression
      }
      
      console.error('Erreur lors de l\'exécution du script Python:', execError);
      
      // Extraire stdout si disponible (peut contenir l'erreur JSON)
      if (execError.stdout) {
        try {
          const errorResult = JSON.parse(execError.stdout.trim());
          return NextResponse.json(
            { 
              success: false,
              error: errorResult.error || 'Erreur lors de la prédiction',
              details: execError.message 
            },
            { status: 500 }
          );
        } catch (parseError) {
          // Si ce n'est pas du JSON valide, continuer avec l'erreur générique
        }
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur lors de l\'exécution du modèle',
          details: execError.message || 'Timeout ou erreur d\'exécution'
        },
        { status: 500 }
      );
    }

    // Nettoyer le fichier temporaire
    try {
      await unlink(tempFilePath);
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier temporaire:', error);
    }

    // Filtrer les warnings TensorFlow/urllib3 qui ne sont pas des erreurs
    const filteredStderr = stderr
      .split('\n')
      .filter(line => 
        !line.includes('WARNING') && 
        !line.includes('tensorflow') && 
        !line.includes('urllib3') &&
        !line.includes('AVX2') &&
        !line.includes('FMA') &&
        line.trim().length > 0
      )
      .join('\n');

    if (filteredStderr) {
      console.error('Erreur Python:', filteredStderr);
    }

    // Parser le résultat JSON
    try {
      // Nettoyer stdout des warnings
      const cleanStdout = stdout
        .split('\n')
        .filter(line => line.trim().startsWith('{') || line.trim().startsWith('['))
        .join('\n')
        .trim();
      
      if (!cleanStdout) {
        throw new Error('Aucune sortie JSON du script Python');
      }
      
      const result = JSON.parse(cleanStdout);
      
      // Vérifier si le résultat indique une erreur
      if (result.success === false) {
        return NextResponse.json(
          { 
            success: false,
            error: result.error || 'Erreur lors de la prédiction',
            details: filteredStderr || 'Erreur inconnue'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(result);
    } catch (parseError: any) {
      console.error('Erreur lors du parsing JSON:', parseError);
      console.error('Stdout reçu:', stdout);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur lors du parsing des résultats',
          details: parseError.message,
          rawOutput: stdout.substring(0, 500) // Premiers 500 caractères pour debug
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}

