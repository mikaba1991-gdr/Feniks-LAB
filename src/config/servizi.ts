// Pagine servizio del ramo Energia: indirizzo, testo (src/content/pagine) e modulo collegato.
export interface ServizioEnergia {
  slug: string;
  nome: string;
  /** Icona della scheda nella pagina Energia */
  icona: 'casa' | 'fiamma' | 'ricevuta';
  /** Id del modulo in src/config/forms, se il servizio ha una richiesta guidata */
  form?: string;
}

// L'ordine è quello delle schede nella pagina Energia
export const serviziEnergia: ServizioEnergia[] = [
  { slug: 'legge-10', nome: 'Legge 10', icona: 'casa' },
  { slug: 'conto-termico', nome: 'Conto Termico', icona: 'fiamma', form: 'conto-termico' },
  { slug: 'detrazioni', nome: 'Detrazioni fiscali', icona: 'ricevuta', form: 'detrazioni' },
];
