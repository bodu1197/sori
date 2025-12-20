export const CURRENT_USER = {
  id: 'user_1',
  username: 'my_music_life',
  name: 'Music Lover',
  avatar: 'https://i.pravatar.cc/150?u=my_music_life',
};

export const STORIES = [
  { id: 's1', username: 'your_story', avatar: CURRENT_USER.avatar, isUser: true },
  { id: 's2', username: 'jazz_vibes', avatar: 'https://i.pravatar.cc/150?u=jazz' },
  { id: 's3', username: 'pop_daily', avatar: 'https://i.pravatar.cc/150?u=pop' },
  { id: 's4', username: 'rock_spirit', avatar: 'https://i.pravatar.cc/150?u=rock' },
  { id: 's5', username: 'lofi_girl', avatar: 'https://i.pravatar.cc/150?u=lofi' },
  { id: 's6', username: 'classic_fm', avatar: 'https://i.pravatar.cc/150?u=classic' },
];

export const POSTS = [
  {
    id: 'p1',
    user: {
      username: 'jazz_vibes',
      avatar: 'https://i.pravatar.cc/150?u=jazz',
      location: 'New York Jazz Club',
    },
    playlist: {
      title: 'Late Night Jazz 🎷',
      cover:
        'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&auto=format&fit=crop',
      tracks: [
        { title: 'Take Five', artist: 'Dave Brubeck' },
        { title: 'So What', artist: 'Miles Davis' },
      ],
    },
    likes: 1243,
    caption: 'Perfect vibes for a rainy night. #jazz #mood #raining',
    comments: 45,
    timestamp: '2 HOURS AGO',
  },
  {
    id: 'p2',
    user: {
      username: 'pop_daily',
      avatar: 'https://i.pravatar.cc/150?u=pop',
    },
    playlist: {
      title: 'Top Hits 2024 🚀',
      cover:
        'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&auto=format&fit=crop',
      tracks: [
        { title: 'Cruel Summer', artist: 'Taylor Swift' },
        { title: 'Vampire', artist: 'Olivia Rodrigo' },
      ],
    },
    likes: 8502,
    caption: 'These songs are on repeat! 🔥 checking out the new charts.',
    comments: 120,
    timestamp: '5 HOURS AGO',
  },
  {
    id: 'p3',
    user: {
      username: 'lofi_girl',
      avatar: 'https://i.pravatar.cc/150?u=lofi',
    },
    playlist: {
      title: 'Study & Chill 📚',
      cover:
        'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop',
      tracks: [{ title: 'Snowman', artist: 'WYS' }],
    },
    likes: 5600,
    caption: 'Focus mode on.',
    comments: 30,
    timestamp: '1 DAY AGO',
  },
];
