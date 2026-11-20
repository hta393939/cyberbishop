# 2D

import pyxel
import math
import random

from pyxel.cube import Node, Camera, Shading, Vec3, Mat4, Primitive

W, H = 256, 256

START_X = 10
START_Y = 100
MES_Y = 104

CI_GROUND = 3
CI_MAINFONT = 7
# 透明キーインデックス
CI_TR0 = 0

MODE_TITLE = "title"
MODE_PLAY = "play"
MODE_GAME_OVER = "game_over"


class LargePlane(Node):
  def __init__(self, x = 0, y = 0, z = 0):
    super().__init__()

    self.pos = Vec3(x, y, z)
    self.angle = 0
    self.transform = Mat4.from_translation(self.pos)

    rate = 8
    size = 8 * 8 * rate
    self.tex = pyxel.Image(size, size)
    #self.tex.cls(8)
    self.tex.bltm(0, 0, 0, # 描画先とタイルインデックス
      4 * 8 * 8, (3 * 8) * 8, # ピクセル単位
      size, size) # ピクセル単位
    #self.tex.text(10, 28, "HELLO 3D", 15)

    self.plane = Primitive.plane(size, size)

  def on_update(self):
    self.angle += 0.03
    self.angle = 180
    rot = Mat4.from_euler(Vec3(0, self.angle, 0))
    self.transform = Mat4.from_translation(self.pos) * rot

  def on_draw(self):
    self.prim(Mat4.IDENTITY, self.plane, self.tex)



class InputManager:
  def __init__(self):
    self.lefts = (pyxel.KEY_A, pyxel.KEY_LEFT, pyxel.GAMEPAD1_BUTTON_DPAD_LEFT)
    self.rights = (pyxel.KEY_D, pyxel.KEY_RIGHT, pyxel.GAMEPAD1_BUTTON_DPAD_RIGHT)
    self.ups = (pyxel.KEY_W, pyxel.KEY_UP, pyxel.GAMEPAD1_BUTTON_DPAD_UP)
    self.downs = (pyxel.KEY_S, pyxel.KEY_DOWN, pyxel.GAMEPAD1_BUTTON_DPAD_DOWN)

    self.buts = (pyxel.GAMEPAD1_BUTTON_A,
      pyxel.GAMEPAD1_BUTTON_B,
      pyxel.GAMEPAD1_BUTTON_X,
      pyxel.GAMEPAD1_BUTTON_Y,
      pyxel.GAMEPAD1_BUTTON_LEFTSHOULDER,
      pyxel.GAMEPAD1_BUTTON_RIGHTSHOULDER)

    self.keyss = (self.ups, self.rights, self.downs, self.lefts,
      self.buts)

    self.axes = (
      pyxel.GAMEPAD1_AXIS_LEFTX,
      pyxel.GAMEPAD1_AXIS_LEFTY,
      pyxel.GAMEPAD1_AXIS_RIGHTX,
      pyxel.GAMEPAD1_AXIS_RIGHTY,
    )

    self.mod_mask = 7
    self.reset()

  def reset(self):
    self.counts = [0, 0, 0, 0, 0]
    self.fires = [False, False, False, False, False]
    self.axess = [0, 0, 0, 0]

  def update(self):
    """fires から取得する"""
    for i in range(5):
      keys = self.keyss[i]
      kdown = 0
      for k in keys:
        kdown += 1 if pyxel.btn(k) else 0
      if kdown >= 1:
        self.counts[i] += 1
      else:
        self.counts[i] = 0
    
      self.fires[i] = (self.counts[i] & self.mod_mask) == 1

    # 4軸から取得する
    for i, v in enumerate(self.axes):
      self.axess[i] = pyxel.btnv(v)



class BaseSprite:

    def __init__(self, x, y, w=8, h=8):
        """ コンストラクタ """
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.vx = 0
        self.vy = 0

    def update(self):
        """ 更新処理 """
        self.x += self.vx
        self.y += self.vy

    def draw(self):
        """ 描画処理(派生クラスで実装) """
        pass

    def move(self, spd, deg):
        """ 移動 """
        rad = deg * math.pi / 180
        self.vx = spd * math.cos(rad) # x方向の速度
        self.vy = spd * math.sin(rad) # y方向の速度

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
  def __init__(self, x, y, suit, number):
    super().__init__(x, y)
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

  def __init__(self, x, y):
    """ コンストラクタ """
    super().__init__(x, y)
    #self.gravity = 0.4 # 重力
    #self.jump_x = 1.0 # ジャンプx
    #self.jump_y = -3.4 # ジャンプy

  def update(self, fires):
    """ 更新処理 """
    super().update()
    #self.vy += self.gravity # Gravity
    if fires[3]:
      self.x -= 10
    if fires[1] or fires[4]:
      self.x += 10
    if fires[0]:
      self.y -= 20
    if fires[2]:
      self.y += 20

  def draw(self):
    """ 描画処理 """
    start_x = 160 + (16 if (pyxel.frame_count % 30) < 15 else 0)
    pyxel.blt(self.x, self.y, 0,
      start_x, 24, self.w, self.h, CI_TR0)
    pyxel.blt(self.x, self.y + 8, 0,
      start_x + 8, 24, self.w, self.h, CI_TR0)
        # Debug
        #pyxel.rectb(self.x, self.y, self.w, self.h, 3)


class TunnelSprite(BaseSprite):

    def __init__(self, x, y, length, top_flg=False):
        """ コンストラクタ """
        super().__init__(x, y, 16, length*8)
        self.length = length # トンネルの長さ
        if(top_flg): self.y -= self.h # トンネル上

    def draw(self):
        """ 描画処理 """
        # Top
        pyxel.blt(self.x, self.y, 0, 
            16, 16, self.w, 8, 0)
        # Debug
        #pyxel.rectb(self.x, self.y, self.w, self.h, 3)

class StaticCube(Node):
  def on_draw(self):
    self.box(Mat4.IDENTITY, Vec3(8, 8, 8), 11)

# Game
class Game:
  def __init__(self):
    """ コンストラクタ """

    # スコアを初期化
    self.score = 0

    # ゲームモード
    self.game_mode = MODE_TITLE

    # プレイヤーを初期化
    self.player = PlayerSprite(START_X, START_Y)

    self.input_manager = InputManager()

    # ステージを初期化
    self.reset()

    # Pyxelの起動
    pyxel.init(W, H, title="cyber")
    pyxel.load("my_resource.pyxres")

    self.root = Node()
    self.root.add_child(StaticCube())

    self.root.add_child(LargePlane(0, 0, 0))

    shading = Shading(pyxel.colors)
    shading.direction = Vec3(0.4, -1, -0.5)
    self.root.shading = shading

    self.root.camera = Camera()
    self.root.camera.ortho_size = 128
    self.root.camera.clear_color = None
    self.root.camera.transform = Mat4.look_at(
      Vec3(0.0, 0.0, 32.0), Vec3.ZERO
    )


    pyxel.run(self.update, self.draw)

  def update(self):
    """ 更新処理 """

    # スコアを更新
    self.score = int(self.player.x - START_X)

    self.input_manager.update()

    # コントロール
    self.control()

    # プレイ中判定
    #if self.game_mode != MODE_PLAY: return

    # プレイヤーを更新
    self.player.update(self.input_manager.fires)

    # トンネルを更新
    for tunnel in self.tunnels:
        tunnel.update()
        if(tunnel.intersects(self.player)):
            self.game_mode = MODE_GAME_OVER
            break

    for card in self.cards:
      card.update()

    self.root.update()

    # 落下判定
    #if H < self.player.y: 
    #    self.game_mode = MODE_GAME_OVER

  def draw(self):
    """ 描画処理 """
    pyxel.cls(CI_GROUND)

    # 回転は??
    #pyxel.camera(self.player.x - START_X, 0)
    # タイルマップ
    #pyxel.bltm(0, 0, 0, 0, 0, 192, 128, 0)
    #pyxel.camera()

    self.root.draw(0, 0, pyxel.width, pyxel.height)
    #if True:
    #  return

    #for card in self.cards:
    #  card.draw()

    # プレイヤーを描画
    self.player.draw()

    pyxel.camera() # カメラ(リセット)

    # メッセージ
    if self.game_mode == MODE_TITLE:
        msg = "SPACE TO PLAY"
        pyxel.text(W/2-len(msg)*2, MES_Y, msg, CI_MAINFONT)
    elif self.game_mode == MODE_GAME_OVER:
        msg = "GAME over"
        pyxel.text(W/2-len(msg)*2, MES_Y, msg, CI_MAINFONT)

    # スコアを描画
    pyxel.text(10, 4,
        "SCORE:{:04}".format(self.score), CI_MAINFONT)

  def reset(self):
    """ ステージを初期化 """

    # プレイヤー
    self.player.x = START_X
    self.player.y = START_Y

    self.rot = 0

    # トンネル
    self.tunnels = []

    self.set_card()

  def control(self):
      """ コントロール """
      if not pyxel.btnp(pyxel.MOUSE_BUTTON_LEFT): return

      # Title -> Play
      if self.game_mode == MODE_TITLE:
        self.game_mode = MODE_PLAY

      # Game Over -> Title
      if self.game_mode == MODE_GAME_OVER:
        self.game_mode = MODE_TITLE
        # Reset
        self.reset()


  def set_card(self):
      self.cards = []
      for i in range(13):
        for j in range(4):
          card = Card(i * 10, 20 + 20 * j,
            (Card.SPADES, Card.HEARTS, Card.DIAMONDS, Card.CLUBS)[j],
            i + 1,
          )
          card.is_face = True if pyxel.rndi(0, 1) == 0 else False
          self.cards.append(card)

      if True:
        card = Card.joker(10, 100)
        self.cards.append(card)

def main():
  """ メイン処理 """
  Game()

if __name__ == "__main__":
  main()


