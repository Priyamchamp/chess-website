import { useState, useEffect } from 'react';
import { FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio('/music/chess-background.mp3'));

  useEffect(() => {
    audio.loop = true;
    audio.volume = 0.3;
    
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio]);

  const toggleMusic = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <button
      onClick={toggleMusic}
      className="fixed bottom-4 right-4 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
      aria-label={isPlaying ? 'Mute music' : 'Play music'}
    >
      {isPlaying ? (
        <FaVolumeUp className="text-2xl text-blue-600" />
      ) : (
        <FaVolumeMute className="text-2xl text-gray-600" />
      )}
    </button>
  );
}

export default BackgroundMusic;