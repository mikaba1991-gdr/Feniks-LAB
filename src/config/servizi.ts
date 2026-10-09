// Pagine servizio del ramo Energia: indirizzo, testo (src/content/pagine) e modulo collegato.
export interface ServizioEnergia {
  slug: string;
  nome: string;
  /** Id del modulo in src/config/forms, se il servizio ha una richiesta guidata */
  form?: string;
}

export const serviziEnergia: ServizioEnergia[] = [
  { slug: 'conto-termico', nome: 'Conto Termico', form: 'conto-termico' },
  { slug: 'detrazioni', nome: 'Detrazioni fiscali', form: 'detrazioni' },
  { slug: 'progettazione-impianti', nome: 'Progettazione impianti e Legge 10' },
];
