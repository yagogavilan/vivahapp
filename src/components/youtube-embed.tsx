import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, radius } from '../theme';

/**
 * Live ou replay do YouTube dentro do app (iPhone e Android).
 * A navegação fica presa ao player: nenhum link da descrição ou do vídeo
 * abre dentro do app (regra das lojas sobre links de compra externos).
 */
export function YouTubeEmbed({ videoId }: { videoId: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0&modestbranding=1`;
  return (
    <View style={styles.box}>
      <WebView
        source={{ uri: src }}
        style={{ flex: 1, backgroundColor: colors.deep }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => req.url.startsWith('https://www.youtube-nocookie.com/embed/') || req.url === 'about:blank'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.deep },
});
