export type PilotLevel = 'PRO' | 'AMATEUR' | 'PRINCIPIANTE';
export type PilotKart = '270cc' | '390cc';

export type PilotRecord = {
  id: string;
  numeroPiloto: number;
  nombre: string;
  apellidos: string;
  edad: number;
  telefono: string;
  redesSociales: string;
  peso: number | null;
  nivel: PilotLevel;
  hasTimeAttack: boolean;
  kart: PilotKart;
  comisario: boolean;
  foto: string | null;
};

export const pilots: PilotRecord[] = createMockPilots(80);

export const initialPilots: PilotRecord[] = pilots;

function createMockPilots(totalPilots: number): PilotRecord[] {
  const firstNames = [
    'Adrián',
    'Marta',
    'Sergio',
    'Lucía',
    'Carlos',
    'Nerea',
    'Iván',
    'Paula',
    'Álvaro',
    'Claudia',
    'Rubén',
    'Elena',
    'Jorge',
    'Aitana',
    'Raúl',
    'Noelia',
    'Dani',
    'Irene',
    'Pablo',
    'Sara'
  ];

  const surnames = [
    'Lozano',
    'Rivas',
    'Peña',
    'Bermúdez',
    'Mendoza',
    'Solís',
    'Ferrer',
    'Crespo',
    'Navarro',
    'Herrera',
    'Romero',
    'Delgado',
    'Pascual',
    'Varela',
    'Campos',
    'Soto',
    'Requena',
    'Cabrera',
    'Llorente',
    'Marín'
  ];

  return Array.from({ length: totalPilots }, (_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const surnameA = surnames[index % surnames.length];
    const surnameB = surnames[(index * 3 + 7) % surnames.length];
    const level = getLevelByIndex(index);
    const initials = `${firstName[0] ?? 'P'}${surnameA[0] ?? 'R'}`.toUpperCase();

    return {
      id: `p-${index + 1}`,
      numeroPiloto: index + 1,
      nombre: firstName,
      apellidos: `${surnameA} ${surnameB}`,
      edad: 18 + (index % 18),
      telefono: `+34 6${String(10000000 + index * 137).padStart(8, '0').slice(0, 8)}`,
      redesSociales: `@${firstName.toLowerCase()}.${surnameA.toLowerCase()}${index + 1}`,
      peso: index % 6 === 0 ? null : 56 + (index % 28),
      nivel: level,
      hasTimeAttack: index % 5 !== 0,
      kart: level === 'PRO' || index % 2 === 0 ? '390cc' : '270cc',
      comisario: index % 11 === 0,
      foto: index % 4 === 0 ? createPhotoPlaceholder(initials, '#1b2638', '#2a5370') : null
    };
  });
}

function getLevelByIndex(index: number): PilotLevel {
  const cycle = index % 3;
  if (cycle === 0) {
    return 'PRO';
  }

  if (cycle === 1) {
    return 'AMATEUR';
  }

  return 'PRINCIPIANTE';
}

function createPhotoPlaceholder(initials: string, startColor: string, endColor: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='${startColor}'/>
        <stop offset='100%' stop-color='${endColor}'/>
      </linearGradient>
    </defs>
    <rect width='400' height='400' fill='url(#g)'/>
    <rect width='400' height='400' fill='rgba(10,15,22,0.18)'/>
    <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='108' font-family='Arial, sans-serif' font-weight='700' letter-spacing='3'>${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
