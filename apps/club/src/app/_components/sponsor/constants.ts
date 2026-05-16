export interface Sponsor {
  name: string;
  logo: string;
  link: string;
};

// you dont need to alphabatize this, the component handles it
export const SPONSORS: Sponsor[] = [
  {
    name: 'american express',
    logo: '/logos/amex.svg',
    link: 'https://www.americanexpress.com'
  },

  {
    name: 'amazon web services',
    logo: '/logos/aws.svg',
    link: 'https://www.aws.amazon.com'
  },

  {
    name: 'microsoft azure',
    logo: '/logos/azure.svg',
    link: 'https://www.azure.microsoft.com'
  },

  {
    name: 'bank of new york',
    logo: '/logos/bny.svg',
    link: 'https://www.bny.com'
  },

];

export const PARTNERS: Sponsor[] = [
];
