
/** Paleta tirada do logo oficial da Vivah. */
export const colors = {
  petrol: '#124F58',
  petrolSoft: '#1B5F69',
  deep: '#0B2A30',
  // Folha: o coral das folhas do logo, só para destaques (recomendada, passo da vez, progresso).
  coral: '#EE7B52',
  coralText: '#B4492B',
  coralSoft: '#FCE8DF',
  // Hortelã: o ponto do logo, para o que foi feito e a evolução.
  mint: '#3FBF9F',
  mintSoft: '#DDF3EC',
  // Névoa: fundo frio e claro (sem o creme de sempre).
  cream: '#EEF3F2',
  surface: '#FFFFFF',
  sand: '#E3ECEA',
  border: '#D6E1DE',
  text: '#124F58',
  textMuted: '#3E5A5F',
  textSubtle: '#587075',
  onDark: '#FFFFFF',
  onDarkMuted: '#CFE3DF',
  danger: '#B3261E',
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayItalic: 'BricolageGrotesque_600SemiBold',
  body: 'NunitoSans_400Regular',
  bodySemi: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
  bodyHeavy: 'NunitoSans_800ExtraBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

/** Largura máxima do conteúdo no desktop. */
export const maxWidth = 1120;

/** A partir desta largura (web/tablet), o app usa menu lateral e duas colunas. */
export const WIDE = 1024;

/** Gradiente de capa por área da vida (tons da marca, sempre com texto claro por cima). */
export const areaGradient = {
  // Uma cor chapada por área (sem degradê decorativo).
  mente: ['#124F58', '#124F58'],
  tempo: ['#2C6E8F', '#2C6E8F'],
  carreira: ['#2D3F66', '#2D3F66'],
  financas: ['#2E7558', '#2E7558'],
  corpo: ['#B85A3C', '#B85A3C'],
  alimentacao: ['#9A7424', '#9A7424'],
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: colors.text },
  title: { fontFamily: fonts.displayItalic, fontSize: 22, lineHeight: 27, letterSpacing: -0.3, color: colors.text },
  heading: { fontFamily: fonts.bodyHeavy, fontSize: 18, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.textMuted },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSubtle },
  // Rótulo discreto, em caixa normal (sem letras maiúsculas espaçadas).
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.textSubtle,
  },
} as const;

// Superfícies chapadas: a hierarquia vem da cor e do espaço, não de sombra.
export const shadow = {} as object;
