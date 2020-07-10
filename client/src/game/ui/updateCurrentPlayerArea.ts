import Konva from 'konva';
import { LABEL_COLOR } from '../../constants';
import { MAX_CLUE_NUM } from '../types/constants';
import globals from './globals';

// Set the "Current Player" area up for this specific turn
export default function updateCurrentPlayerArea(currentPlayerIndex: number | null) {
  // The "Current Player" area is never visible in solo replays / shared replays
  if (globals.replay) {
    return;
  }

  const currentPlayerArea = globals.elements.currentPlayerArea!;
  currentPlayerArea.visible((
    // Don't show it we happen to have the in-game replay open
    !globals.inReplay
    // Don't show it if the clue UI is there
    && (!globals.ourTurn || globals.clues === 0)
    // Don't show it if the premove button is there
    && !globals.elements.premoveCancelButton!.isVisible()
    && currentPlayerIndex !== null // Don't show it if this is the end of the game
  ));

  // Even if the "Current Player" area is not currently visible,
  // we must continue to update it behind the scenes
  // Otherwise, when the player exits out of the in-game replay,
  // the arrow would be pointing to the wrong player
  // However, when the game is over, "currentPlayerIndex" is set to null,
  // and the "Current Player" area will never be visible again
  if (currentPlayerIndex === null) {
    return;
  }

  // Local variables
  const winW = globals.stage.width();
  const winH = globals.stage.height();

  // Update the text
  const { text1, text2, text3 } = currentPlayerArea;
  let specialText = '';
  if (!globals.lobby.settings.realLifeMode) {
    if (globals.clues === 0) {
      specialText = '(cannot clue; 0 clues left)';
      text3.fill('red');
    } else if (globals.clues === MAX_CLUE_NUM) {
      specialText = `(cannot discard; at ${MAX_CLUE_NUM} clues)`;
      text3.fill(LABEL_COLOR);
    } else if (
      globals.lobby.settings.hyphenatedConventions
      && globals.elements.playerHands[currentPlayerIndex].isLocked()
    ) {
      specialText = '(locked; may not be able to discard)';
      text3.fill(LABEL_COLOR);
    } else if (
      globals.lobby.settings.hyphenatedConventions
      && globals.elements.noDoubleDiscardBorder!.isVisible()
    ) {
      specialText = '(potentially in a "Double Discard" situation)';
      text3.fill('yellow');
    }
  }

  const setPlayerText = (threeLines: boolean) => {
    const { rect1, textValues, values } = currentPlayerArea;

    text2.fitText(globals.playerNames[currentPlayerIndex]);

    let maxSize = (values.h / 3) * winH;
    if (threeLines) {
      maxSize = (values.h / 4) * winH;
    }
    text2.width(textValues.w * winW);
    text2.resize();
    while (text2.measureSize(text2.text()).height > maxSize) {
      text2.width(text2.width() * 0.9);
      text2.resize();
    }
    text2.x((rect1.width() / 2) - (text2.width() / 2));
  };

  const totalH = currentPlayerArea.height();
  const text1H = text1.measureSize(text1.text()).height;
  if (specialText === '') {
    // 2 lines
    setPlayerText(false);
    const text2H = text2.measureSize(text2.text()).height;
    const spacing = 0.03 * winH;
    text1.y((totalH / 2) - (text1H / 2) - spacing);
    text2.y((totalH / 2) - (text2H / 2) + spacing);
    text3.hide();
  } else {
    // 3 lines
    setPlayerText(true);
    const text2H = text2.measureSize(text2.text()).height;
    const spacing = 0.04 * winH;
    text1.y((totalH / 2) - (text1H / 2) - spacing);
    text2.y((totalH / 2) - (text2H / 2) + (spacing * 0.25));
    text3.y((totalH / 2) - (text1H / 2) + (spacing * 1.5));
    text3.fitText(specialText);
    text3.show();
  }

  // Make the arrow point to the current player
  const hand = globals.elements.playerHands[currentPlayerIndex];
  const centerPos = hand.getAbsoluteCenterPos();
  const thisPos = currentPlayerArea.arrow.getAbsolutePosition();
  const x = centerPos.x - thisPos.x;
  const y = centerPos.y - thisPos.y;
  const radians = Math.atan(y / x);
  let rotation = radians * (180 / Math.PI);
  if (x < 0) {
    rotation += 180;
  }

  if (globals.animateFast) {
    currentPlayerArea.arrow!.rotation(rotation);
  } else {
    if (currentPlayerArea.tween !== null) {
      currentPlayerArea.tween.destroy();
      currentPlayerArea.tween = null;
    }

    // We want the arrow to always be moving clockwise
    const oldRotation = currentPlayerArea.arrow.rotation();
    const unmodifiedRotation = rotation;
    if (oldRotation > rotation) {
      rotation += 360;
    }

    currentPlayerArea.tween = new Konva.Tween({
      node: currentPlayerArea.arrow,
      duration: 0.75,
      rotation,
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        currentPlayerArea.arrow.rotation(unmodifiedRotation);
      },
    }).play();
  }
}
