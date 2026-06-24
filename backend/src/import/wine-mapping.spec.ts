import {
  deriveType, deriveCountry, parseVintage, deriveWinery, derivePrice, mapRowToWine,
} from './wine-mapping';

describe('deriveType', () => {
  it('detecta espumante, blanco, rosado, fortificado y tinto por defecto', () => {
    expect(deriveType('Pommery Brut', 'Champagne Blend')).toBe('Espumante');
    expect(deriveType('Cloudy Bay', 'Sauvignon Blanc')).toBe('Blanco');
    expect(deriveType('Whispering Angel', 'Rosé')).toBe('Rosado');
    expect(deriveType("Graham’s 20 Year", 'Port')).toBe('Fortificado');
    expect(deriveType('Catena Malbec', 'Malbec')).toBe('Tinto');
  });
});

describe('deriveCountry', () => {
  it('mapea regiones conocidas a país', () => {
    expect(deriveCountry('Mendoza')).toBe('Argentina');
    expect(deriveCountry('Napa Valley, California')).toBe('US');
    expect(deriveCountry('Rioja')).toBe('España');
    expect(deriveCountry('Tuscany')).toBe('Italia');
  });
  it('usa el último segmento si no conoce la región', () => {
    expect(deriveCountry('Algún Valle, Uruguay')).toBe('Uruguay');
  });
  it('devuelve "Otro" si viene vacío', () => {
    expect(deriveCountry('')).toBe('Otro');
  });
});

describe('parseVintage', () => {
  it('extrae el año del nombre', () => {
    expect(parseVintage('Catena Malbec 2016')).toBe(2016);
  });
  it('devuelve null si no hay año válido', () => {
    expect(parseVintage('Catena Malbec')).toBeNull();
  });
});

describe('deriveWinery', () => {
  it('toma la marca al inicio del nombre, cortando en la cepa/año', () => {
    expect(deriveWinery('Catena Zapata Malbec 2016')).toBe('Catena Zapata');
    expect(deriveWinery('1000 Stories Bourbon Barrel Aged Red 2016')).toBe('1000 Stories Bourbon');
  });
  it('devuelve algo no vacío aun con nombres raros', () => {
    expect(deriveWinery('Tinto')).not.toBe('');
  });
});

describe('derivePrice', () => {
  it('crece con el puntaje y es estable', () => {
    expect(derivePrice(80)).toBeCloseTo(6, 1);
    expect(derivePrice(90)).toBeGreaterThan(derivePrice(85));
  });
});

describe('mapRowToWine', () => {
  it('mapea una fila completa', () => {
    const m = mapRowToWine({
      name: 'Catena Zapata Malbec 2016', region: 'Mendoza', variety: 'Malbec',
      rating: '93.0', notes: 'Ciruela y violetas.',
    });
    expect(m).not.toBeNull();
    expect(m!.name).toBe('Catena Zapata Malbec 2016');
    expect(m!.wineryName).toBe('Catena Zapata');
    expect(m!.type).toBe('Tinto');
    expect(m!.country).toBe('Argentina');
    expect(m!.origin).toContain('Mendoza');
    expect(m!.origin).toContain('Argentina');
    expect(m!.vintage).toBe(2016);
    expect(m!.criticScore).toBe(93);
    expect(m!.tastingNote).toBe('Ciruela y violetas.');
    expect(m!.descriptors.source).toBe('wine-ratings');
    expect(m!.referencePrice).toBeGreaterThan(0);
  });
  it('devuelve null si no hay nombre', () => {
    expect(mapRowToWine({ name: '  ', region: 'x', variety: 'y', rating: '90', notes: '' })).toBeNull();
  });
});
