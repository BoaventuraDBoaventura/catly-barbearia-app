
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  icon: string;
}

export interface Professional {
  id: string;
  name: string;
  rating: number;
  photo: string;
}

export interface Barbershop {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  distance: number;
  latitude?: number;
  longitude?: number;
  rating: number;
  isOpen: boolean;
  closingTime?: string;
  image: string;
  services: Service[];
  professionals: Professional[];
  isPremium?: boolean;
}

export interface Appointment {
  id: string;
  barbershopName: string;
  serviceName: string;
  professionalName: string;
  date: string;
  time: string;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled';
  clientName?: string;
  clientPhoto?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
  visits: number;
  favorites: string[]; // Barbershop IDs
}
