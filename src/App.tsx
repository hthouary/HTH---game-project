import { useGameStore } from './store/gameStore';
import NewGameScreen from './screens/NewGameScreen';
import GameScreen from './screens/GameScreen';

export default function App() {
  const hasFestival = useGameStore((s) => s.game.festival !== null);
  return hasFestival ? <GameScreen /> : <NewGameScreen />;
}
