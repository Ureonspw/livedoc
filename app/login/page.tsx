"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import Link from "next/link";
import Classes from "@/app/Assets/styles/Auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    mot_de_passe: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de la connexion");
        setIsLoading(false);
        return;
      }

      // Rediriger vers le dashboard correspondant
      if (data.redirectPath) {
        router.push(data.redirectPath);
      } else {
        // Redirection par défaut selon le rôle
        const role = data.user?.role;
        if (role === "ADMIN") {
          router.push("/dashboardadmin");
        } else if (role === "INFIRMIER") {
          router.push("/dashboardinfirmier");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      console.error("Erreur:", err);
      setError("Une erreur est survenue. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className={Classes.authContainer}>
      <div className={Classes.authBackground}></div>
      <div className={Classes.authCard}>
        <div className={Classes.authHeader}>
          <Link href="/" className={Classes.logoLink}>
            <h1 className={Classes.authLogo}>LIVEDOC</h1>
          </Link>
          <h2 className={Classes.authTitle}>Connexion</h2>
          <p className={Classes.authSubtitle}>
            Connectez-vous à votre compte pour accéder au système
          </p>
        </div>

        <form className={Classes.authForm} onSubmit={handleSubmit}>
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
            <label htmlFor="mot_de_passe" className={Classes.formLabel}>
              Mot de passe
            </label>
            <div className={Classes.inputWrapper}>
              <FiLock className={Classes.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                id="mot_de_passe"
                name="mot_de_passe"
                className={Classes.formInput}
                placeholder="Votre mot de passe"
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

          <div className={Classes.formOptions}>
            <label className={Classes.checkboxLabel}>
              <input type="checkbox" className={Classes.checkbox} />
              <span>Se souvenir de moi</span>
            </label>
            <a href="#" className={Classes.forgotLink}>
              Mot de passe oublié ?
            </a>
          </div>

          <button 
            type="submit" 
            className={Classes.submitButton}
            disabled={isLoading}
          >
            {isLoading ? "Connexion..." : "Se connecter"}
            {!isLoading && <FiArrowRight />}
          </button>

          <div className={Classes.authFooter}>
            <p>
              Vous n'avez pas de compte ?{" "}
              <Link href="/register" className={Classes.authLink}>
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

