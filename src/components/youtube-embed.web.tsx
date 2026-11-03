import { createElement } from 'react';
import { View } from 'react-native';

import { colors, radius } from '../theme';

/** Live ou replay do YouTube na versão web. */
export function YouTubeEmbed({ videoId }: { videoId: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`;
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.deep }}>
      {createElement('iframe', {
        src,
        title: 'Live Vivah',
        style: { border: 0, width: '100%', height: '100%' },
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowFullScreen: true,
      })}
    </View>
  );
}
