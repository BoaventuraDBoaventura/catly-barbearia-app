
import { Barbershop, Appointment, User } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'João Silva',
  email: 'joao.silva@email.com',
  photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop',
  visits: 12,
  favorites: ['b1', 'b2']
};

export const MOCK_BARBERSHOPS: Barbershop[] = [
  {
    id: 'b1',
    name: 'Barbearia do Zé',
    address: 'Rua Augusta, 1500',
    neighborhood: 'Consolação',
    distance: 0.8,
    rating: 4.9,
    isOpen: true,
    closingTime: '20:00',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop',
    isPremium: true,
    services: [
      { id: 's1', name: 'Corte Degradê', description: 'Corte moderno com acabamento premium', price: 45, duration: 45, icon: 'content_cut' },
      { id: 's2', name: 'Barba Completa', description: 'Toalha quente e massagem facial', price: 35, duration: 30, icon: 'face' },
      { id: 's5', name: 'Tratamento Capilar', description: 'Hidratação e fortalecimento', price: 80, duration: 60, icon: 'spa' }
    ],
    professionals: [
      { id: 'p1', name: 'João', rating: 4.9, photo: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?q=80&w=100&h=100&auto=format&fit=crop' },
      { id: 'p2', name: 'Maria', rating: 5.0, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&h=100&auto=format&fit=crop' }
    ]
  },
  {
    id: 'b2',
    name: "Gentleman's Club",
    address: 'Av. Paulista, 2000',
    neighborhood: 'Bela Vista',
    distance: 1.2,
    rating: 4.7,
    isOpen: true,
    closingTime: '21:00',
    image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=800&auto=format&fit=crop',
    services: [
      { id: 's3', name: 'Corte Social', description: 'Corte clássico e elegante', price: 50, duration: 40, icon: 'content_cut' },
      { id: 's6', name: 'Combo Premium', description: 'Cabelo, Barba e Sobrancelha', price: 120, duration: 90, icon: 'diamond' }
    ],
    professionals: [
      { id: 'p3', name: 'Pedro', rating: 4.8, photo: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&h=100&auto=format&fit=crop' }
    ]
  },
  {
    id: 'b3',
    name: 'Navalha de Ouro',
    address: 'Rua da Consolação, 500',
    neighborhood: 'Centro',
    distance: 2.5,
    rating: 4.5,
    isOpen: false,
    closingTime: '19:00',
    image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop',
    services: [
      { id: 's4', name: 'Barba Terapia', description: 'Tratamento completo para fios', price: 40, duration: 40, icon: 'face' }
    ],
    professionals: []
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    barbershopName: 'Barbearia do Zé',
    serviceName: 'Corte Degradê',
    professionalName: 'João',
    date: '24 Out',
    time: '14:30',
    price: 45,
    status: 'confirmed',
    clientName: 'Carlos Eduardo',
    clientPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&h=100&auto=format&fit=crop'
  },
  {
    id: 'a2',
    barbershopName: "Gentleman's Club",
    serviceName: 'Corte Social',
    professionalName: 'Pedro',
    date: '28 Out',
    time: '10:00',
    price: 50,
    status: 'pending',
    clientName: 'Lucas Mendes',
    clientPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&h=100&auto=format&fit=crop'
  }
];
