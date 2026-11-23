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
    self.draw_suit = suit + Card.SPADES

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
        self.draw_suit * 8, 3 * 8, self.w, self.h)
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
    self.rest_num = 4 * 13
    # True だとまだピックされていない
    # A: 0, 2: 1, ... 12: K
    self.rests = []
    for i in range(4):
      rest = [True] * 13
      self.rests.append(rest)
    self.hands = []
    #self.hands = [[{"suit": -1, "number": -1}] * 5] * 10
    for i in range(10):
      hand = [{"suit": -1, "number": -1}] * 5
      self.hands.append(hand)
    self.anys = [{"suit": -1, "number": -1}] * 2

  def __str__(self) -> str:
    ret = f'{self.anys}\n'
    for i, s in enumerate(self.rests):
      ret += f'{i} {s}\n'
    for i, h in enumerate(self.hands):
      ret += f'{i} {h}\n'
    return ret

  def pick(self, suit, index_number):
    """13を入れたら1として扱いインデックスは0"""
    self.rests[suit][0 if index_number == 13 else index_number] = False
    self.rest_num -= 1

  def check(self, suit, index_number):
    """残っていたら True"""
    return self.rests[suit][0 if index_number == 13 else index_number]

  def count_suit(self):
    ret = [0, 0, 0, 0]
    for i in range(4):
      for j in range(13):
        ret[i] += 1 if self.rests[i][j] else 0
    return ret

  def clone(self):
    ret = Phase()
    ret.rests = self.rests.deepcopy()
    ret.hands = self.hands.deepcopy()
    ret.anys = self.anys.deepcopy()
    ret.rest_num = self.rest_num
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
      cbut = self.input_manager.fires[6]
      if abut:
        if sel:
          if not sel.is_face:
            self.add_sel(sel)

        else:
          pass

      #if bbut:
      # 閉じる
      #pyxel.play(CH_SE, SE_CANCEL)
      if cbut:
        self.set_card_by_phase()


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
          j, i + 1)
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

  def create_phase(self):
    """ラップアラウンド無し"""

    cur = Phase()

    # 9, ロイヤル
    suit = pyxel.rndi(0, 3)
    for i, number in enumerate((13, 12, 11, 10, 9)):
      cur.pick(suit, number)
      cur.hands[9][i] = {"suit": suit, "number": number}

    # 8, ストレートフラッシュ
    number = pyxel.rndi(5 - 1, 13 - 1)
    sseq = [0, 1, 2, 3]
    self.shuffle(sseq)
    for i in range(4):
      s = sseq[i]
      count = 0
      for j in range(5):
        count += 1 if cur.check(s, number - j) else 0
      if count != 5:
        continue

      for j in range(5):
        n = number - j
        cur.pick(s, n)
        cur.hands[8][j] = {"suit": s, "number": n}
      break

    # 7, フォーの4つ A-10 はもう使えない
    seq = list(range(2 - 1, 10 - 1))
    self.shuffle(seq)
    for i in range(10 - 2):
      n = seq[i]
      count = 0
      for j in (0, 1, 2, 3):
        count += 1 if cur.check(j, n) else 0
      if count < 4:
        continue

      for j in (0, 1, 2, 3):
        cur.pick(j, n)
        cur.hands[7][j] = {"suit": j, "number": n}
      break

    print(cur)

    # 6, フルハウスの3, 3, スリーカードの3
    seq = list(range(13))
    self.shuffle(seq)
    index = 0
    for h in [6, 3]:
      for _ in range(13):
        n = seq[index]
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        # pick 順番
        pseq = []
        for j in range(4):
          s = sseq[j]
          if cur.check(s, n):
            pseq.append(s)
        if len(pseq) < 3:
          index += 1
          continue
        # 3枚以上選択した場合
        pseq = sorted(pseq[:3], reverse=False)

        for k, s in enumerate(pseq):
          cur.pick(s, n)
          cur.hands[h][k] = {"suit": s, "number": n}
        break


    # ストレート
    seq = list(range(5 - 1, 15 - 1))
    self.shuffle(seq)
    for start_n in seq:
      pseq = []
      flash_suit = -11
      for j in range(5):
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        p = None
        for s in sseq:
          n = start_n - j
          if cur.check(s, n) and s != flash_suit:
            p = {"suit": s, "number": n}
            break
        if not p:
          break
        pseq.append(p)
        if j == 3:
          count = 0
          for k in range(4):
            count += 1 if pseq[k]["suit"] == pseq[0]["suit"] else 0
          flash_suit = pseq[0]["suit"] if count == 4 else -9

      if len(pseq) < 5:
        continue

      for i, v in enumerate(pseq):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[4][i] = {"suit": s, "number": n}
      break


    # 0: ハイカード(1-1-1-1-1)
    for _ in range(10):
      seq = list(range(13))
      self.shuffle(seq)
      index = 0
      flash_suit = -11
      stn_upper = -11
      stn_lower = -11
      pseq = []
      for i in range(13):
        n = seq[i]
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        for j in range(4):
          s = sseq[j]
          if cur.check(s, n) and s != flash_suit and n != stn_upper and n != stn_lower:
            pseq.append({"suit": s, "number": n})
            break
        if len(pseq) == 4 and flash_suit == -11:
          count = 0
          for k in range(4):
            count += 1 if pseq[k]["suit"] == pseq[0]["suit"] else 0
          flash_suit = pseq[0]["suit"] if count == 4 else -9

          # ストレート回避 未実装


      if len(pseq) < 5:
        continue

      pseq = pseq[:5]
      #upper = max(pseq)
      #lower = min(pseq)
      #if upper - lower == 4:
      #  continue

      for i, v in enumerate(pseq):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[0][i] = {"suit": s, "number": n}
      break


    print(f'rest, {cur.rest_num}, {cur}')
    # フラッシュ(5)
    sseq = [0, 1, 2, 3]
    self.shuffle(sseq)
    for s in sseq:
      seq = list(range(13))
      self.shuffle(seq)
      # 数字を入れる
      pseq = []
      for n in seq:
        if cur.check(s, n):
          pseq.append(n)

      num = len(pseq)
      if num < 5:
        continue

      if num == 5:
        # ストレートかぶりチェック
        upper = max(pseq)
        lower = min(pseq)
        if upper - lower == 4:
          continue
      else: # 6以上は確定で作れる
        pseq = pseq[:6]
        # フラッシュかぶりチェック
        for i in range(6):
          clone = list(pseq)
          clone.pop(5 - i)
          upper = max(clone)
          lower = min(clone)
          if upper - lower == 4:
            continue
          pseq = clone
          break

      pseq = sorted(pseq, reverse=True)
      # A は先頭へ
      if pseq[4] == 1 - 1:
        ace = pseq.pop(4)
        pseq.insert(0, ace)

      for i, n in enumerate(pseq):
        cur.pick(s, n)
        cur.hands[5][i] = {"suit": s, "number": n}
      break


    # ツーペア(2-2-1)
    seq = list(range(13))
    self.shuffle(seq)
    cands = []
    for pair_n in seq:
      sseq = [0, 1, 2, 3]
      self.shuffle(sseq)
      cs = []
      for s in sseq:
        if cur.check(s, pair_n):
          cs.append({"suit": s, "number": pair_n})
      if len(cs) >= 2:
        cs = cs[:2]
        if cs[0]["suit"] > cs[1]["suit"]:
          cs = [cs[1],  cs[0]]
        cands.append(cs)
    if len(cands) < 2:
      print(f'pair too few, {len(cands)}')

    cands = cands[:2]
    index = 0 if cands[0][0]["number"] > cands[1][0]["number"] else 1
    pseq = [cands[index][0], cands[index][1], cands[1-index][0], cands[1-index][1]]

    # 2ペアの最後の1枚
    pair_ns = [pseq[0]["number"], pseq[2]["number"]]
    seq = list(range(13))
    self.shuffle(seq)
    for n in seq:
      if n == pair_ns[0] or n == pair_ns[1]:
        continue
      sseq = [0, 1, 2, 3]
      self.shuffle(sseq)
      for s in sseq:
        if cur.check(s, n):
          pseq.append({"suit": s, "number": n})
          break

      if len(pseq) == 5:
        break

    for i, v in enumerate(pseq):
      s = v["suit"]
      n = v["number"]
      cur.pick(s, n)
      cur.hands[2][i] = v


    # ワンペア(1-3)
    for _ in range(10):
      seq = list(range(13))
      self.shuffle(seq)
      cands = []
      for pair_n in seq:
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        cs = []
        for s in sseq:
          if cur.check(s, pair_n):
            cs.append({"suit": s, "number": pair_n})
        if len(cs) < 2:
          continue
        cs = cs[:2]
        if cs[0]["suit"] > cs[1]["suit"]:
          cs = [cs[1], cs[0]]
        cands.append(cs[0])
        cands.append(cs[1])
        break

      if len(cands) <= 0:
        print(f'pair not exist for one pair')
        break

      pair_n = cands[0]["number"]
      # 残り3枚
      noseq = list(range(13))
      self.shuffle(noseq)
      for n in noseq:
        if n == pair_n:
          continue
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        for s in sseq:
          if cur.check(s, n):
            cands.append({"suit": s, "number": n})
            break

      if len(cands) < 5:
        continue

      cands = cands[:5]
      # 後ろ3つの降順ソート未実装
      for i, v in enumerate(cands):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[1][i] = {"suit": s, "number": n}
      break


    # スリーの残り(2)
    three_n = cur.hands[3][0]["number"]
    seq = list(range(13))
    self.shuffle(seq)
    cands = []
    for n in seq:
      if three_n == n:
        continue
      sseq = [0, 1, 2, 3]
      self.shuffle(sseq)
      for s in sseq:
        if cur.check(s, n):
          cands.append({"suit": s, "number": n})
          break
    if len(cands) < 2:
      print(f'too few for three rest')
    else:
      cands = cands[:2]
      # 降順ソート未実装
      for i, v in enumerate(cands):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[3][i+3] = {"suit": s, "number": n}


    # フルハウスの残り
    for pair_n in seq:
      sseq = [0, 1, 2, 3]
      self.shuffle(sseq)
      cs = []
      for s in sseq:
        if cur.check(s, pair_n):
          cs.append({"suit": s, "number": pair_n})
      if len(cs) < 2:
        continue

      cs = cs[:2]
      for i, v in enumerate(cs):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[6][i + 3] = {"suit": s, "number": n}
      break


    # フォーの残りとオープン(3)
    pseq = []
    for s in range(4):
      for n in range(13):
        if not cur.check(s, n):
          continue
        pseq.append({"suit": s, "number": n})
        #cur.pick(s, n)

    if len(pseq) != 3:
      print(f'rest num {len(pseq)} is not 3')

    index = pyxel.rndi(0, 2)
    cur.hands[7][4] = pseq.pop(index)
    cur.pick(cur.hands[7][4]["suit"], cur.hands[7][4]["number"])
    cur.anys = pseq

    print(cur)
    return cur

  def set_card_by_phase(self):
    cur = self.create_phase()

    cards = []

    # 上位と下位
    for i in range(5):
      for j in range(5):
        for k in range(2):
          # k0: 上位, k1: 下位
          index = 4 - i + (1 - k) * 5
          bx = j + k * 5
          by = i

          v = cur.hands[index][j]
          card = Card(bx, by, v["suit"], v["number"] + 1)
          cards.append(card)


    # オープン
    for i, v in enumerate(cur.anys):
      card = Card(5 + i, -1, v["suit"], v["number"] + 1)
      cards.append(card)

    self.cards = cards



def main():
    """ メイン処理 """
    Game()

if __name__ == "__main__":
    main()


