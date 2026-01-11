"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  FiUpload, FiImage, FiX, FiCheck, FiAlertCircle, FiFile,
  FiHome, FiArrowLeft, FiDownload, FiRefreshCw
} from "react-icons/fi";
import Classes from "@/app/Assets/styles/Prediction.module.css";

interface PredictionResult {
  id: string;
  fileName: string;
  imageUrl: string;
  prediction: number;
  confidence: number;
  probability?: number;
  status: "processing" | "success" | "error";
  errorMessage?: string;
  confidenceLevel?: string;
  threshold?: number;
  details?: {
    probability: number;
    explanation: string;
    features: string[];
    interpretation?: string;
    recommendation?: string | null;
  };
}

export default function PredictionTuberculosePage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processPredictions = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsProcessing(true);
    const newPredictions: PredictionResult[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const imageUrl = URL.createObjectURL(file);
      
      // Créer une prédiction en attente
      const prediction: PredictionResult = {
        id: `pred-${Date.now()}-${i}`,
        fileName: file.name,
        imageUrl,
        prediction: 0,
        confidence: 0,
        status: "processing"
      };

      newPredictions.push(prediction);
      setPredictions(prev => [...prev, prediction]);

      try {
        // Appel API réel
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/predict', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          // Essayer de récupérer le message d'erreur du serveur
          let errorMessage = `Erreur HTTP: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch (e) {
            // Si on ne peut pas parser le JSON, utiliser le message par défaut
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        if (result.success) {
          const finalPrediction: PredictionResult = {
            ...prediction,
            status: "success" as const,
            prediction: result.prediction,
            confidence: result.confidence,
            confidenceLevel: result.confidenceLevel,
            threshold: result.threshold,
            probability: result.probability,
            details: result.details
          };

          setPredictions(prev => 
            prev.map(p => p.id === prediction.id ? finalPrediction : p)
          );
        } else {
          throw new Error(result.error || 'Erreur lors de la prédiction');
        }
      } catch (error: any) {
        console.error('Erreur lors de la prédiction:', error);
        const errorPrediction: PredictionResult = {
          ...prediction,
          status: "error" as const,
          errorMessage: error.message || 'Erreur inconnue'
        };

        setPredictions(prev => 
          prev.map(p => p.id === prediction.id ? errorPrediction : p)
        );
      }
    }

    setIsProcessing(false);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setPredictions([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  return (
    <div className={Classes.predictionContainer}>
      {/* Header */}
      <header className={Classes.header}>
        <Link href="/dashboard" className={Classes.backLink}>
          <FiArrowLeft />
          <span>Retour au dashboard</span>
        </Link>
        <div className={Classes.headerContent}>
          <h1 className={Classes.pageTitle}>
            <FiImage />
            Prédiction de Tuberculose par IA
          </h1>
          <p className={Classes.pageSubtitle}>
            Téléchargez une image ou un dossier d'images pour obtenir une analyse assistée par IA
          </p>
        </div>
      </header>

      <div className={Classes.contentWrapper}>
        {/* Upload Section */}
        <div className={Classes.uploadSection}>
          <div className={Classes.uploadCard}>
            <h2 className={Classes.sectionTitle}>Télécharger des images</h2>
            
            <div
              className={`${Classes.uploadZone} ${dragActive ? Classes.dragActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FiUpload className={Classes.uploadIcon} />
              <p className={Classes.uploadText}>
                Glissez-déposez vos images ici ou cliquez pour sélectionner
              </p>
              <p className={Classes.uploadHint}>
                Formats acceptés : JPG, PNG, DICOM
              </p>
              <div className={Classes.uploadButtons}>
                <button
                  className={Classes.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiFile />
                  Sélectionner des fichiers
                </button>
                <button
                  className={`${Classes.uploadButton} ${Classes.secondary}`}
                  onClick={() => folderInputRef.current?.click()}
                >
                  <FiFile />
                  Sélectionner un dossier
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className={Classes.hiddenInput}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                webkitdirectory=""
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className={Classes.hiddenInput}
              />
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className={Classes.filesList}>
                <div className={Classes.filesListHeader}>
                  <span className={Classes.filesCount}>
                    {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné{selectedFiles.length > 1 ? 's' : ''}
                  </span>
                  <button className={Classes.clearButton} onClick={clearAll}>
                    <FiX />
                    Tout effacer
                  </button>
                </div>
                <div className={Classes.filesGrid}>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className={Classes.fileItem}>
                      <div className={Classes.filePreview}>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className={Classes.fileImage}
                        />
                        <button
                          className={Classes.removeFileButton}
                          onClick={() => removeFile(index)}
                        >
                          <FiX />
                        </button>
                      </div>
                      <div className={Classes.fileInfo}>
                        <p className={Classes.fileName}>{file.name}</p>
                        <p className={Classes.fileSize}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className={Classes.processButton}
                  onClick={processPredictions}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <FiRefreshCw className={Classes.spinning} />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <FiCheck />
                      Lancer l'analyse IA
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {predictions.length > 0 && (
          <div className={Classes.resultsSection}>
            <h2 className={Classes.sectionTitle}>Résultats de l'analyse</h2>
            <div className={Classes.resultsGrid}>
              {predictions.map((prediction) => (
                <div key={prediction.id} className={Classes.resultCard}>
                  <div className={Classes.resultHeader}>
                    <div className={Classes.resultImageContainer}>
                      <img
                        src={prediction.imageUrl}
                        alt={prediction.fileName}
                        className={Classes.resultImage}
                      />
                      {prediction.status === "processing" && (
                        <div className={Classes.processingOverlay}>
                          <FiRefreshCw className={Classes.spinning} />
                          <span>Analyse en cours...</span>
                        </div>
                      )}
                    </div>
                    <div className={Classes.resultFileName}>
                      {prediction.fileName}
                    </div>
                  </div>

                  {prediction.status === "success" && prediction.details && (
                    <div className={Classes.resultBody}>
                      <div className={Classes.predictionResult}>
                        <div className={Classes.resultLabel}>
                          {prediction.prediction === 1 ? (
                            <>
                              <FiAlertCircle className={Classes.alertIcon} />
                              Tuberculose détectée
                            </>
                          ) : (
                            <>
                              <FiCheck className={Classes.checkIcon} />
                              Aucune tuberculose
                            </>
                          )}
                        </div>
                        <div className={Classes.confidenceBar}>
                          <div
                            className={`${Classes.confidenceFill} ${
                              prediction.prediction === 1 ? Classes.positive : Classes.negative
                            }`}
                            style={{ width: `${prediction.details.probability * 100}%` }}
                          ></div>
                          <span className={Classes.confidenceText}>
                            {Math.round(prediction.details.probability * 100)}% de confiance
                          </span>
                        </div>
                        
                        {/* Informations supplémentaires comme dans test_model.py */}
                        <div className={Classes.additionalInfo}>
                          <div className={Classes.infoRow}>
                            <span className={Classes.infoLabel}>Probabilité de TB:</span>
                            <span className={Classes.infoValue}>
                              {prediction.probability.toFixed(4)} ({(prediction.probability * 100).toFixed(2)}%)
                            </span>
                          </div>
                          <div className={Classes.infoRow}>
                            <span className={Classes.infoLabel}>Confiance:</span>
                            <span className={Classes.infoValue}>
                              {prediction.confidenceLevel || 'N/A'}
                            </span>
                          </div>
                          <div className={Classes.infoRow}>
                            <span className={Classes.infoLabel}>Seuil utilisé:</span>
                            <span className={Classes.infoValue}>
                              {prediction.threshold || 0.12}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interprétation et recommandation */}
                      {prediction.details.interpretation && (
                        <div className={Classes.interpretationBox}>
                          <h4 className={Classes.interpretationTitle}>
                            💡 Interprétation
                          </h4>
                          <p className={Classes.interpretationText}>
                            ⚠️ {prediction.details.interpretation}
                          </p>
                          {prediction.details.recommendation && (
                            <p className={Classes.recommendationText}>
                              👨‍⚕️ {prediction.details.recommendation}
                            </p>
                          )}
                        </div>
                      )}

                      <div className={Classes.explanationBox}>
                        <h4 className={Classes.explanationTitle}>Explication</h4>
                        <p className={Classes.explanationText}>
                          {prediction.details.explanation}
                        </p>
                      </div>

                      <div className={Classes.featuresBox}>
                        <h4 className={Classes.featuresTitle}>Caractéristiques détectées</h4>
                        <ul className={Classes.featuresList}>
                          {prediction.details.features.map((feature, idx) => (
                            <li key={idx} className={Classes.featureItem}>
                              <span className={Classes.featureDot}></span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button className={Classes.downloadButton}>
                        <FiDownload />
                        Télécharger le rapport
                      </button>
                    </div>
                  )}

                  {prediction.status === "error" && (
                    <div className={Classes.errorBox}>
                      <FiAlertCircle />
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Erreur lors de l'analyse</div>
                        <div style={{ fontSize: '0.85em', opacity: 0.9 }}>
                          {prediction.errorMessage || 'Erreur inconnue'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

