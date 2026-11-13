import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { MenuScene } from './MenuScene';
import { SettingsScene } from './SettingsScene';
import { getCanvasBackground } from './theme';

export function createGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 640,
    backgroundColor: getCanvasBackground(),
    scene: [MenuScene, SettingsScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  return new Phaser.Game(config);
}
