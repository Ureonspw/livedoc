// Helper pour gérer l'authentification côté client

export interface User {
  id: number
  nom: string
  prenom: string
  email: string
  role: 'MEDECIN' | 'INFIRMIER' | 'ADMIN'
}

export async function getSession(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    })
    
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error)
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    })
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}

export function getRedirectPath(role: string): string {
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

