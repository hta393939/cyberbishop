# 2D

import pyxel
import math
import random

W, H = 128, 128

MES_Y = 104

CI_GROUND = 3
CI_MAINFONT = 7
# 透明キーインデックス
CI_TR0 = 0

CH_SE = 3

SE_SUC = 0
SE_BEEP = 1
SE_ON = 2
SE_MOVE = 3
SE_MENU = 4
SE_CANCEL = 5
SE_WALK = 6

MODE_TITLE = "title"
MODE_PLAY = "play"
MODE_GAME_OVER = "game_over"


class InputManager:
  def __init__(self):
    self.lefts = (pyxel.KEY_A, pyxel.KEY_LEFT, pyxel.GAMEPAD1_BUTTON_DPAD_LEFT)
    self.rights = (pyxel.KEY_D, pyxel.KEY_RIGHT, pyxel.GAMEPAD1_BUTTON_DPAD_RIGHT)
    self.ups = (pyxel.KEY_W, pyxel.KEY_UP, pyxel.GAMEPAD1_BUTTON_DPAD_UP)
    self.downs = (pyxel.KEY_S, pyxel.KEY_DOWN, pyxel.GAMEPAD1_BUTTON_DPAD_DOWN)

    self.abuts = (
      pyxel.KEY_Z,
      pyxel.GAMEPAD1_BUTTON_A,
    )
    self.bbuts = (
      pyxel.KEY_X,
      pyxel.GAMEPAD1_BUTTON_B,
    )

    self.keyss = (self.ups, self.rights, self.downs, self.lefts,
      self.abuts, self.bbuts)

    self.axes = (
      pyxel.GAMEPAD1_AXIS_LEFTX,
      pyxel.GAMEPAD1_AXIS_LEFTY,
    )

    self.mod_mask = 7
    self.reset()

  def reset(self):
    self.counts = [0, 0, 0, 0, 0, 0]
    self.fires = [False, False, False, False, False, False]

  def update(self):
    """fires から取得する"""
    for (i, keys) in enumerate(self.keyss):
      kdown = 0
      for k in keys:
        kdown += 1 if pyxel.btn(k) else 0
      if kdown >= 1:
        self.counts[i] += 1
      else:
        self.counts[i] = 0
    
      self.fires[i] = (self.counts[i] & self.mod_mask) == 1


class BaseSprite:
  BW = 13
  BH = 5

  def __init__(self, bx, by, w=8, h=8):
    """ コンストラクタ """
    self.bx = bx
    self.by = by
    self.calc()
    self.w = w
    self.h = h

  def calc(self):
    """ブロック番号から位置へ"""
    self.x = self.bx * 10
    self.y = self.by * 20

  def update(self):
    """ 更新処理 """
    pass

  def draw(self):
    """ 描画処理(派生クラスで実装) """
    pass

  def move(self, spd, deg):
    """ 移動 """
    pass

  def intersects(self, other):
    """ 矩形同士の当たり判定(AABB) """
    if other.x + other.w < self.x: return False
    if self.x + self.w < other.x: return False
    if other.y + other.h < self.y: return False
    if self.y + self.h < other.y: return False
    return True

class Card(BaseSprite):
  SPADES = 16
  HEARTS = 17
  DIAMONDS = 18
  CLUBS = 19
  HOR_TOP = 20
  VERT_TOP = 22
  JOKER_SUIT = 24
  JOKER_NUMBER = 25
  TEN_OFFSET = 26
  ACE = 30
  def __init__(self, bx, by, suit, number):
    super().__init__(0, 0)
    self.bx = bx
    self.by = by
    self.calc()

    self.suit = suit
    self.number = number
    self.draw_number = number
    if number == 1:
      self.draw_number = Card.ACE
    elif number >= 10 and number <= 13:
      self.draw_number = number + Card.TEN_OFFSET - 10


    self.is_face = True

  @staticmethod
  def joker(x, y):
    card = Card(x, y, Card.JOKER_SUIT, Card.JOKER_NUMBER)
    return card

  def update(self):
    super().update()

  def draw(self):
    if self.is_face:
      pyxel.blt(self.x, self.y, 1,
        self.suit * 8, 3 * 8, self.w, self.h)
      pyxel.blt(self.x, self.y + 8, 1,
        self.draw_number * 8, 3 * 8, self.w, self.h)
    else:
      pyxel.blt(self.x, self.y, 1,
        Card.VERT_TOP * 8, 3 * 8, self.w, self.h)
      pyxel.blt(self.x, self.y + 8, 1,
        (Card.VERT_TOP + 1) * 8, 3 * 8, self.w, self.h)


class PlayerSprite(BaseSprite):

  def __init__(self, bx, by):
    """ コンストラクタ """
    super().__init__(bx, by)
    self.bx = bx
    self.by = by
    self.calc()

  def update(self, fires):
    """ 更新処理 """
    super().update()

    if fires[4]:
      pyxel.play(CH_SE, SE_ON)
    if fires[5]:
      pyxel.play(CH_SE, SE_CANCEL)

    dx = 0
    dy = 0

    if fires[3]:
      dx = -1
    if fires[1]:
      dx = 1
    if fires[0]:
      dy = -1
    if fires[2]:
      dy = 1

    self.bx += dx
    self.by += dy
    if self.bx < 0:
      self.bx = 0
      dx = 0
    elif self.bx > 13:
      self.bx = 0
      dx = 0
    if self.by < 0:
      self.by = 0
      dy = 0
    elif self.by > 4:
      self.by = 4
      dy = 0


    result = self.calc()
    if dx != 0 or dy != 0:
      pyxel.play(CH_SE, SE_MOVE)


  def draw(self):
    """ 描画処理 """
    start_x = 160 + (16 if (pyxel.frame_count % 30) < 15 else 0)
    pyxel.blt(self.x, self.y, 0,
      start_x, 24, self.w, self.h, CI_TR0)
    pyxel.blt(self.x, self.y + 8, 0,
      start_x + 8, 24, self.w, self.h, CI_TR0)
      # Debug
      #pyxel.rectb(self.x, self.y, self.w, self.h, 3)

# Game
class Game:
  def __init__(self):
    """ コンストラクタ """

    # スコアを初期化
    self.score = 0
    self.gain = 0.04

    # ゲームモード
    self.game_mode = MODE_TITLE

    # プレイヤーを初期化
    self.player = PlayerSprite(0, 0)

    self.input_manager = InputManager()

    # ステージを初期化
    self.reset()

    # Pyxelの起動
    pyxel.init(W, H, title="Hello, Pyxel!!")
    pyxel.load("my_resource.pyxres")
    pyxel.run(self.update, self.draw)

    # my_resource.pyxpal 取りに行ってるんだが??



  def update(self):
    """ 更新処理 """

    self.input_manager.update()

    # コントロール
    self.control()

    # プレイ中判定
    if self.game_mode != MODE_PLAY: return

    # プレイヤーを更新
    self.player.update(self.input_manager.fires)

    for card in self.cards:
      card.update()

  def draw(self):
    """ 描画処理 """
    pyxel.cls(CI_GROUND)

    # タイルマップ
    #pyxel.bltm(0, 0, 0, 0, 0, 192, 128, 0)

    # カメラ(セット)
    #pyxel.camera(self.player.x - START_X, 0)

    for card in self.cards:
      card.draw()

    # プレイヤーを描画
    self.player.draw()

    #pyxel.camera() # カメラ(リセット)

    # メッセージ
    if self.game_mode == MODE_TITLE:
      msg = "CLICK TO PLAY"
      pyxel.text(W/2-len(msg)*2, MES_Y, msg, CI_MAINFONT)
      pyxel.gen_bgm(3, 0, 1, 1234, play=True)
      pyxel.channels[0].gain = self.gain
      pyxel.channels[1].gain = self.gain
      pyxel.channels[2].gain = self.gain

    elif self.game_mode == MODE_GAME_OVER:
      msg = "GAME over"
      pyxel.text(W/2-len(msg)*2, MES_Y, msg, CI_MAINFONT)

    # スコアを描画
    pyxel.text(10, 4,
      "SCORE:{:04}".format(self.score), CI_MAINFONT)

  def reset(self):
    """ ステージを初期化 """

    # プレイヤー
    self.player.x = 0
    self.player.y = 0

    self.set_card()

  def control(self):
    """ コントロール """
    if not pyxel.btnp(pyxel.MOUSE_BUTTON_LEFT): return

    # Title -> Play
    if self.game_mode == MODE_TITLE:
      self.game_mode = MODE_PLAY
      pyxel.play(CH_SE, 3)
      return

    # Game Over -> Title
    if self.game_mode == MODE_GAME_OVER:
      self.game_mode = MODE_TITLE

      # Reset
      self.reset()
      return

    if self.game_mode == MODE_PLAY:
      self.game_mode == MODE_GAME_OVER
      pyxel.play(CH_SE, 2)


  def set_card(self):
    self.cards = []
    for i in range(13):
      for j in range(4):
        card = Card(i, 1 + j,
          (Card.SPADES, Card.HEARTS, Card.DIAMONDS, Card.CLUBS)[j],
          i + 1,
        )
        card.is_face = True if pyxel.rndi(0, 1) == 0 else False
        self.cards.append(card)

    if True:
      card = Card.joker(1, 4)
      self.cards.append(card)

def main():
    """ メイン処理 """
    Game()

if __name__ == "__main__":
    main()


