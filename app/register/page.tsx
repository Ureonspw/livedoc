"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiMail, FiLock, FiUser, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import Link from "next/link";
import Classes from "@/app/Assets/styles/Auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    mot_de_passe: "",
    confirm_password: "",
    role: "medecin",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.mot_de_passe !== formData.confirm_password) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.mot_de_passe.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          mot_de_passe: formData.mot_de_passe,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        setIsLoading(false);
        return;
      }

      // Rediriger vers le dashboard correspondant
      const role = data.user?.role;
      if (role === "ADMIN") {
        router.push("/dashboardadmin");
      } else if (role === "INFIRMIER") {
        router.push("/dashboardinfirmier");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Erreur:", err);
      setError("Une erreur est survenue. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getPasswordStrength = (password: string): string => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    if (password.match(/[a-z]/) && password.match(/[A-Z]/) && password.match(/[0-9]/) && password.match(/[^a-zA-Z0-9]/)) {
      return 'strong';
    }
    return 'medium';
  };

  const getPasswordStrengthPercent = (password: string): number => {
    const strength = getPasswordStrength(password);
    if (strength === 'weak') return 33;
    if (strength === 'medium') return 66;
    if (strength === 'strong') return 100;
    return 0;
  };

  const getPasswordStrengthText = (password: string): string => {
    const strength = getPasswordStrength(password);
    if (strength === 'weak') return 'Faible';
    if (strength === 'medium') return 'Moyen';
    if (strength === 'strong') return 'Fort';
    return '';
  };

  return (
    <div className={Classes.authContainer}>
      <div className={Classes.authBackground}></div>
      <div className={Classes.authCard}>
        <div className={Classes.authHeader}>
          <Link href="/" className={Classes.logoLink}>
            <h1 className={Classes.authLogo}>LIVEDOC</h1>
          </Link>
          <h2 className={Classes.authTitle}>Inscription</h2>
          <p className={Classes.authSubtitle}>
            Créez votre compte pour accéder au système de gestion médicale
          </p>
        </div>

        <form className={Classes.authForm} onSubmit={handleSubmit}>
          <div className={Classes.formRow}>
            <div className={Classes.formGroup}>
              <label htmlFor="nom" className={Classes.formLabel}>
                Nom
              </label>
              <div className={Classes.inputWrapper}>
                <FiUser className={Classes.inputIcon} />
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  className={Classes.formInput}
                  placeholder="Votre nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={Classes.formGroup}>
              <label htmlFor="prenom" className={Classes.formLabel}>
                Prénom
              </label>
              <div className={Classes.inputWrapper}>
                <FiUser className={Classes.inputIcon} />
                <input
                  type="text"
                  id="prenom"
                  name="prenom"
                  className={Classes.formInput}
                  placeholder="Votre prénom"
                  value={formData.prenom}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className={Classes.formGroup}>
            <label htmlFor="email" className={Classes.formLabel}>
              Email
            </label>
            <div className={Classes.inputWrapper}>
              <FiMail className={Classes.inputIcon} />
              <input
                type="email"
                id="email"
                name="email"
                className={Classes.formInput}
                placeholder="votre.email@exemple.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={Classes.formGroup}>
            <label htmlFor="role" className={Classes.formLabel}>
              Rôle
            </label>
            <div className={Classes.inputWrapper}>
              <select
                id="role"
                name="role"
                className={Classes.formSelect}
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="medecin">Médecin</option>
                <option value="personnel">Personnel d'accueil / Infirmier</option>
                <option value="administrateur">Administrateur</option>
              </select>
            </div>
          </div>

          <div className={Classes.passwordSection}>
            <div className={Classes.formGroup}>
              <label htmlFor="mot_de_passe" className={Classes.formLabel}>
                Mot de passe
              </label>
              <div className={Classes.passwordWrapper}>
                <div className={Classes.inputWrapper}>
                  <FiLock className={Classes.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="mot_de_passe"
                    name="mot_de_passe"
                    className={Classes.formInput}
                    placeholder="Créez un mot de passe sécurisé"
                    value={formData.mot_de_passe}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className={Classes.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {formData.mot_de_passe && (
                  <div className={`${Classes.passwordStrength} ${Classes[getPasswordStrength(formData.mot_de_passe)]}`}>
                    <div className={Classes.strengthBar}>
                      <div 
                        className={`${Classes.strengthFill} ${Classes[getPasswordStrength(formData.mot_de_passe)]}`}
                        style={{ width: `${getPasswordStrengthPercent(formData.mot_de_passe)}%` }}
                      ></div>
                    </div>
                    <span className={Classes.strengthText}>
                      {getPasswordStrengthText(formData.mot_de_passe)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className={Classes.formGroup}>
              <label htmlFor="confirm_password" className={Classes.formLabel}>
                Confirmer le mot de passe
              </label>
              <div className={Classes.inputWrapper}>
                <FiLock className={Classes.inputIcon} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirm_password"
                  name="confirm_password"
                  className={`${Classes.formInput} ${formData.confirm_password && formData.mot_de_passe !== formData.confirm_password ? Classes.inputError : formData.confirm_password && formData.mot_de_passe === formData.confirm_password ? Classes.inputSuccess : ''}`}
                  placeholder="Répétez votre mot de passe"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className={Classes.passwordToggle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {formData.confirm_password && (
                <div className={Classes.passwordMatch}>
                  {formData.mot_de_passe === formData.confirm_password ? (
                    <span className={Classes.matchSuccess}>✓ Les mots de passe correspondent</span>
                  ) : (
                    <span className={Classes.matchError}>✗ Les mots de passe ne correspondent pas</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ 
              color: 'red', 
              padding: '10px', 
              backgroundColor: '#fee', 
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className={Classes.submitButton}
            disabled={isLoading}
          >
            {isLoading ? "Création du compte..." : "Créer mon compte"}
            {!isLoading && <FiArrowRight />}
          </button>

          <div className={Classes.authFooter}>
            <p>
              Vous avez déjà un compte ?{" "}
              <Link href="/login" className={Classes.authLink}>
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

