import { Platform } from 'react-native';

/** Paleta tirada do logo oficial da Vivah. */
export const colors = {
  petrol: '#124F58',
  petrolSoft: '#1B5F69',
  deep: '#0B2A30',
  coral: '#F4865C',
  coralText: '#B04A33',
  coralSoft: '#FBE1D5',
  mint: '#45C2A4',
  mintSoft: '#D8F2EA',
  cream: '#F6F2EA',
  surface: '#FFFDF8',
  sand: '#ECE6DA',
  border: '#E2DACB',
  text: '#124F58',
  textMuted: '#4A5A55',
  textSubtle: '#5E6E68',
  onDark: '#F6F2EA',
  onDarkMuted: '#C9DDD5',
  danger: '#B3261E',
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_400Regular_Italic',
  body: 'NunitoSans_400Regular',
  bodySemi: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
  bodyHeavy: 'NunitoSans_800ExtraBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

/** Largura máxima do conteúdo no desktop. */
export const maxWidth = 960;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.text },
  heading: { fontFamily: fonts.bodyHeavy, fontSize: 18, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.textMuted },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSubtle },
  eyebrow: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: colors.coralText,
  },
} as const;

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(18,79,88,0.06), 0 6px 20px rgba(18,79,88,0.06)' },
  default: {
    shadowColor: '#124F58',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
}) as object;
