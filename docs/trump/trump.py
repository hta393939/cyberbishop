# 2D

import pyxel
import math
import copy
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
    self.cbuts = (
      pyxel.KEY_C,
      pyxel.GAMEPAD1_BUTTON_X,
    )

    self.keyss = (self.ups, self.rights, self.downs, self.lefts)
    self.triggerss = (self.abuts, self.bbuts, self.cbuts)

    self.axes = (
      pyxel.GAMEPAD1_AXIS_LEFTX,
      pyxel.GAMEPAD1_AXIS_LEFTY,
    )

    self.mod_mask = 7
    self.reset()

  def reset(self):
    self.counts = [0] * 7
    self.fires = [False] * 7

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

    for (i, triggers) in enumerate(self.triggerss):
      trig = False
      for k in triggers:
        trig = trig or pyxel.btnp(k, 15, 4)
      self.fires[i + 4] = trig
    


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
    self.visible = True

  def calc(self):
    """ブロック番号から位置へ"""
    self.x = self.bx * 10
    self.y = 20 + self.by * 20

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

    # ペア済みだと True
    self.paired = False

    self.suit = suit
    # 判定用数値
    self.number = number
    # 描画用参照
    self.draw_number = number
    if number == 1 or number == 14:
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
    if not self.visible:
      return

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

    # 移動
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
    elif self.bx > 12:
      self.bx = 12
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


class Phase:
  def __init__(self):
    # True だとまだピックされていない
    # A: 0, 2: 1, ... 12: K
    self.cards = [[True] * 4] * 13
    self.hands = [[{suit: -1, number: -1}] * 5] * 10
    self.anys = [{suit: -1, number: -1}] * 2

  def pick(self, suit, number):
    """14を入れたら1として扱いインデックスは0"""
    self.cards[suit][(1 if number == 14 else number) - 1] = False

  def check(self, suit, number):
    """残っていたら True"""
    return self.cards[suit][(1 if number == 14 else number) - 1]

  def count_suit(self):
    ret = [0, 0, 0, 0]
    for i in range(4):
      for j in range(13):
        ret[i] += 1 if self.cards[i][j] else 0
    return ret

  def clone(self):
    ret = Phase()
    ret.cards = self.cards.deepcopy()
    ret.hands = self.hands.deepcopy()
    ret.anys = self.anys.deepcopy()
    return ret


# Game
class Game:
  def __init__(self):
    """ コンストラクタ """

    # スコアを初期化
    self.gain = 0.04
    self.first_gen = True


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

    # プレイヤーを更新
    self.player.update(self.input_manager.fires)

    # コントロール
    self.control()

    # プレイ中判定
    if self.game_mode != MODE_PLAY: return



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

      if self.first_gen:
        self.first_gen = False
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

    self.score = 0
    self.fail_count = 0

    # カーソル
    self.player.x = 0
    self.player.y = 20 + 4 * 20

    self.set_card()

  def control(self):
    """ コントロール """

    if self.game_mode == MODE_PLAY:
      self.play_control()


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


  def play_control(self):
    self.fail_count -= 1
    if self.fail_count == 0:
      for v in self.selected:
        v.is_face = False
      self.selected = []

    if self.fail_count <= 0:
      sel = self.find_by_pos(self.player.bx, self.player.by)
      abut = self.input_manager.fires[4]
      bbut = self.input_manager.fires[5]
      if abut:
        if sel:
          if not sel.is_face:
            self.add_sel(sel)

        else:
          pass

      #if bbut:
      # 閉じる
      #pyxel.play(CH_SE, SE_CANCEL)


  def add_sel(self, add: Card):
    """カード選択を追加する"""
    if not add:
      return

    if add.paired or add.is_face:
      pyxel.play(CH_SE, SE_CANCEL)
      return

    add.is_face = True
    self.selected.append(add)
    if len(self.selected) == 1:
      pyxel.play(CH_SE, SE_ON)
      return

    # 通常チェック(任意ジョーカー無し)
    sels = [self.selected[0].number, self.selected[1].number]
    ok = False
    if sels[0] == sels[1]:
      ok = True
    else:
      # オープン救済
      for i, v in enumerate(self.opened):
        if v.paired:
          continue

        if sels[0] != v.number and sels[1] != v.number:
          continue

        ok = True
        # 非マッチを閉じる
        index = 0 if sels[0] == v.number else 1
        unmatch = 1 - index

        self.selected[unmatch].is_face = False

        self.selected[unmatch] = v


    if ok:
      self.selected[0].paired = True
      self.selected[1].paired = True
      self.selected = []
      pyxel.play(CH_SE, SE_SUC)
      self.score += 100
    else:
      self.fail_count = 45
      pyxel.play(CH_SE, SE_BEEP)
      self.score -= 10
      if self.score < 0:
        self.score = 0
        self.game_mode = MODE_GAME_OVER


  def set_card(self):
    self.selected = []
    self.opened = []
    self.cards = []
    for i in range(13):
      for j in range(4):
        card = Card(i, j,
          (Card.SPADES, Card.HEARTS, Card.DIAMONDS, Card.CLUBS)[j],
          i + 1,
        )
        card.is_face = True if pyxel.rndi(0, 1) == 0 else False

        n = len(self.opened)
        if n < 2:
          card.bx = 10 + n
          card.by = -1
          #card.by = 4
          card.calc()
          self.opened.append(card)

        self.cards.append(card)

    if False:
      card = Card.joker(1, 4)
      self.cards.append(card)



  def find_by_pos(self, bx, by):
    '''ブロック座標でカードを探す'''
    ret = None
    for i, v in enumerate(self.cards):
      if v.bx == bx and v.by == by:
        ret = v
    return ret



  def shuffle(self, target):
    # 後で seed 配下にするかも
    random.shuffle(target)

  def set_card_by_phase(self):
    """ラップアラウンド無し"""

    cur = Phase()

    # 9, ロイヤル
    suit = pyxel.rndi(0, 3)
    for i, number in (14, 13, 12, 11, 10):
      cur.pick(suit, number)
      cur.hands[9][i] = {suit: suit, number: number}

    # 7, フォーの4つ
    number = pyxel.rndi(2, 9)
    for i, s in (0, 1, 2, 3):
      cur.pick(s, number)
      cur.hands[7][i] = {suit: s, number: number}

    # 8, ストレートフラッシュ
    for _ in range(10):
      suit = pyxel.rndi(0, 3)
      number = pyxel.rndi(5, 13)
      count = 0
      for i in range(5):
        count += 1 if cur.check(suit, number - i) else 0
      if count != 5:
        continue

      for i in range(5):
        cur.pick(suit, number - i)
        cur.hands[8][i] = {suit: suit, number: number - i}


    # 6, フルハウスの3, 3, スリーカードの3
    seq = list(range(13))
    self.shuffle(seq)
    index = 0
    for h in [6, 3]:
      for _ in range(13):
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        # pick 順番
        pseq = []
        for j in range(4):
          if cur.pick(sseq[j], seq[index]):
            pseq.append(sseq[j])
        if len(pseq) < 3:
          index += 1
          continue
        # 3枚以上選択した場合
        pseq = sorted(pseq[:2])

        for k, v in pseq:
          cur.pick(v, index)
          cur.hands[h][k] = {suit: v, number: index}


    # ストレート
    for _ in range(10):
      number = pyxel.rndi(5, 14)
      # 未実装

    # ハイカード(1-1-1-1-1)
    for _ in range(10):
      seq = range(13)
      self.shuffle(seq)
      index = 0
      flash_suit = -2
      straight_number = -2
      pseq = []
      for i in range(13):
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        for j in range(4):
          s = sseq[j]
          n = seq[i]
          if cur.pick(s, n) and s != flash_suit and n != straight_number:
            pseq.append({suit: sseq[j], number: seq[i]})
            break
        if len(pseq) == 4 and flash_suit == -2:
          straight_suit = -1
          count = 0
          for k in range(4):
            count += 1 if pseq[k].suit == pseq[0].suit else 0
          flash_suit = pseq[0].suit if count == 4 else -1

          # ストレート回避 未実装

      # 4枚までピックして最後はストレートとフラッシュ回避にした方が楽かも

      if len(pseq) < 5:
        continue


    # フラッシュ(5)
    sseq = [0, 1, 2, 3]
    self.shuffle(sseq)
    for v in sseq:
      seq = range(13)
      self.shuffle(seq)

      pseq = []
      for n in seq:
        if cur.check(v, n):
          pseq.append(n)

      if len(pseq) < 5:
        continue

      # 5個以上ある場合
      # フラッシュかぶりチェック


    # ツーペア(2-2-1)
    seq = range(13)
    self.shuffle(seq)
    for i in range(2):
      pass

    # ワンペア(1-3)
    # フルハウスの残りのペア(2) スリーの残り(2)

    # フォーの残りとオープン(3)

    pass


def main():
    """ メイン処理 """
    Game()

if __name__ == "__main__":
    main()


