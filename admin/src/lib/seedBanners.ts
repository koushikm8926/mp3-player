import { prisma } from './prisma';

export const DEFAULT_BANNERS = [
  {
    badge: 'Featured Albums',
    titleLine1: 'Feel The',
    titleLine2: 'Music',
    subtitle: 'Discover new sounds and timeless classics',
    accentColor: '#C084FC',
    buttonColor: '#8B5CF6',
    gradientStart: '#2A0A4B',
    gradientEnd: '#5B1A8C',
    icon: 'headset',
    order: 0,
    isPublished: true,
  },
  {
    badge: 'Spiritual Essentials',
    titleLine1: 'Inner Peace',
    titleLine2: '& Harmony',
    subtitle: 'Soothing devotional chants, mantras & melodies',
    accentColor: '#FB7185',
    buttonColor: '#E11D48',
    gradientStart: '#4A041D',
    gradientEnd: '#9F1239',
    icon: 'flame',
    order: 1,
    isPublished: true,
  },
  {
    badge: 'Top Trending',
    titleLine1: 'Top Hits',
    titleLine2: '2026',
    subtitle: 'Stream today’s top viral chartbusters & songs',
    accentColor: '#38BDF8',
    buttonColor: '#2563EB',
    gradientStart: '#0F172A',
    gradientEnd: '#1E3A8A',
    icon: 'trending-up',
    order: 2,
    isPublished: true,
  },
  {
    badge: 'Lo-Fi Beats',
    titleLine1: 'Focus &',
    titleLine2: 'Unwind',
    subtitle: 'Chill beats for studying, working or relaxing',
    accentColor: '#818CF8',
    buttonColor: '#4945FF',
    gradientStart: '#1E1B4B',
    gradientEnd: '#4338CA',
    icon: 'cafe',
    order: 3,
    isPublished: true,
  },
  {
    badge: 'Party Anthem',
    titleLine1: 'Unstoppable',
    titleLine2: 'Party Beats',
    subtitle: 'High energy dance mixes to get you moving',
    accentColor: '#F472B6',
    buttonColor: '#DB2777',
    gradientStart: '#701A75',
    gradientEnd: '#BE185D',
    icon: 'flash',
    order: 4,
    isPublished: true,
  },
];

export async function ensureDefaultBanners() {
  try {
    for (const banner of DEFAULT_BANNERS) {
      const existing = await prisma.banner.findFirst({
        where: {
          titleLine1: banner.titleLine1,
          titleLine2: banner.titleLine2,
        },
      });

      if (!existing) {
        await prisma.banner.create({
          data: banner,
        });
      }
    }
  } catch (error) {
    console.error('Error seeding default banners:', error);
  }
}
