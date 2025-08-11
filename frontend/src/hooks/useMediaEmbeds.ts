export function useYouTubePlaylistId(
  uploadsPlaylistId?: string,
  channelId?: string
): string | undefined {
  if (uploadsPlaylistId) return uploadsPlaylistId;
  if (!channelId) return undefined;
  return channelId.startsWith('UC') ? `UU${channelId.substring(2)}` : undefined;
}

export function useSpotifyEmbedUrl(showId: string): string {
  return `https://open.spotify.com/embed/show/${showId}?utm_source=generator`;
}


