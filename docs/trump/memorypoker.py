# 2D

import pyxel
import math
import copy
import random

W, H = 128, 128

GAME_NAME = "memorypoker"
GAME_GENRE = GAME_NAME
# スート
OPEN_SUIT = True

MES_Y = 120

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

HIGH_ACE = 14

MODE_TITLE = "title"
MODE_PLAY = "play"
MODE_GAME_OVER = "game_over"
MODE_GAME_CLEAR = "game_clear"

class InputManager:
  def __init__(self):
    self.lefts = (pyxel.KEY_A, pyxel.KEY_LEFT, pyxel.GAMEPAD1_BUTTON_DPAD_LEFT)
    self.rights = (pyxel.KEY_D, pyxel.KEY_RIGHT, pyxel.GAMEPAD1_BUTTON_DPAD_RIGHT)
    self.ups = (pyxel.KEY_W, pyxel.KEY_UP, pyxel.GAMEPAD1_BUTTON_DPAD_UP)
    self.downs = (pyxel.KEY_S, pyxel.KEY_DOWN, pyxel.GAMEPAD1_BUTTON_DPAD_DOWN)

    self.abuts = (
      pyxel.KEY_Z,
      pyxel.KEY_SPACE,
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
    self.dbuts = (
      pyxel.KEY_V,
      pyxel.GAMEPAD1_BUTTON_Y,
      pyxel.GAMEPAD1_BUTTON_BACK,
      pyxel.GAMEPAD1_BUTTON_START,
    )

    self.keyss = (self.ups, self.rights, self.downs, self.lefts)
    self.triggerss = (self.abuts, self.bbuts, self.cbuts, self.dbuts)

    self.axes = (
      pyxel.GAMEPAD1_AXIS_LEFTX,
      pyxel.GAMEPAD1_AXIS_LEFTY,
    )

    self.mod_mask = 7
    self.reset()

  def reset(self):
    self.counts = [0] * 8
    self.fires = [False] * 8

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
  def __init__(self, bx, by, w=8, h=8):
    """ コンストラクタ """
    self.bx = bx
    self.by = by
    self.calc()
    self.w = w
    self.h = h
    self.visible = True
    self.timer = -1

  def calc(self):
    """ブロック番号から位置へ"""
    #global GAME_GENRE, GAME_NAME
    if GAME_GENRE == GAME_NAME:
      self.x = (1 + self.bx + (2 if self.bx >= 5 else 0)) * 10
      self.y = 20 + self.by * 20
    else:
      self.x = self.bx * 10
      self.y = 20 + self.by * 20

  def update(self):
    """ 更新処理 """
    if self.timer > 0:
      self.timer -= 1
      if self.timer == 0:
        self.timer = -1
        self.visible = False
      else:
        self.visible = True


  def draw(self):
    """ 描画処理(派生クラスで実装) """
    pass


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
    if number == 1 or number == HIGH_ACE:
      self.draw_number = Card.ACE
    elif number >= 10 and number <= 13:
      self.draw_number = number + Card.TEN_OFFSET - 10

    self.is_face = True

  @staticmethod
  def joker(x, y):
    card = Card(x, y, Card.JOKER_SUIT, Card.JOKER_NUMBER)
    return card

  @staticmethod
  def dict_comp(a, b):
    ascore = (3 - a["suit"]) + (HIGH_ACE if a["number"] == 1 else a["number"]) * 10
    bscore = (3 - b["suit"]) + (HIGH_ACE if b["number"] == 1 else b["number"]) * 10
    return ascore - bscore



  def num_equal(self, b: Card) -> bool:
    if self.number == b.number:
      return True
    if self.number == HIGH_ACE and b.number == 1:
      return True
    if self.number == 1 and b.number == HIGH_ACE:
      return True
    return False

  def update(self):
    super().update()

  def draw(self):
    if not self.visible:
      return

    if OPEN_SUIT:
      pyxel.blt(self.x, self.y, 1,
        self.draw_suit * 8, 3 * 8, self.w, self.h)
      if self.is_face:
        pyxel.blt(self.x, self.y + 8, 1,
          self.draw_number * 8, 3 * 8, self.w, self.h)
      else:
        pyxel.blt(self.x, self.y + 8, 1,
          (Card.VERT_TOP + 1) * 8, 3 * 8, self.w, self.h)
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


class KeepSprite(BaseSprite):
  def __init__(self, bx, by, index = 0):
    """ コンストラクタ """
    super().__init__(bx, by)
    self.w = 8
    self.h = 16
    self.bx = bx
    self.by = by
    self.calc()
    self.index = index

  def draw(self):
    """ 描画処理 """
    if not self.visible:
      return

    start_x = 8 * self.index + (8 if (pyxel.frame_count % 30) < 15 else 0)
    pyxel.blt(self.x, self.y, 0,
      start_x, 16, self.w, self.h, CI_TR0)

      # Debug
      #pyxel.rectb(self.x, self.y, self.w, self.h, 3)


class PlayerSprite(BaseSprite):

  def __init__(self, bx, by):
    """ コンストラクタ """
    super().__init__(bx, by)
    self.bx = bx
    self.by = by
    self.calc()
    self.w = 8
    self.h = 16

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

    if dx != 0: # 横優先で斜め不可
      dy = 0

    bnum = 10

    self.bx += dx
    self.by += dy
    if self.bx < 0:
      self.bx = 0
      dx = 0
    elif self.bx >= bnum:
      self.bx = bnum - 1
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
    start_x = 176 + (8 if (pyxel.frame_count % 30) < 15 else 0)
    pyxel.blt(self.x, self.y, 0,
      start_x, 16, self.w, self.h, CI_TR0)
      # Debug
      #pyxel.rectb(self.x, self.y, self.w, self.h, 3)


class Phase:
  def __init__(self):
    self.rest_num = 4 * 13
    # True だとまだピックされていない
    # A: 1, ... 13: K
    self.rests = []
    for i in range(4):
      rest = [True] * 15
      rest[0] = False
      self.rests.append(rest)
    self.hands = []
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
    """14を入れたら ace として扱いインデックスは1"""
    self.rests[suit][1 if index_number == HIGH_ACE else index_number] = False
    self.rest_num -= 1

  def check(self, suit, index_number):
    """残っていたら True"""
    return self.rests[suit][1 if index_number == HIGH_ACE else index_number]

  def count_suit(self):
    ret = [0, 0, 0, 0]
    for i in range(4):
      for n in range(1, HIGH_ACE + 1):
        ret[i] += 1 if self.rests[i][n] else 0
    return ret

  def count_number(self):
    ret = [0] * 15
    for n in range(1, HIGH_ACE + 1):
      for s in range(4):
        ret[n] += 1 if self.rests[s][n] else 0
    # ace のコピー
    union = ret[1] + ret[HIGH_ACE]
    ret[1] = union
    ret[HIGH_ACE] = union
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
    self.game_mode = MODE_PLAY

    # プレイヤーを初期化
    self.player = PlayerSprite(0, 0)
    self.keep = KeepSprite(0, 0, 28)
    self.keep.visible = False
    self.effs = [KeepSprite(4, -1, 24), KeepSprite(5, -1, 26)]
    for v in self.effs:
      v.visible = False

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

    for eff in self.effs:
      eff.update()

  def draw(self):
    """ 描画処理 """
    pyxel.cls(CI_GROUND)

    if GAME_GENRE == GAME_NAME:
      for i in range(10):
        x = (0 if i < 5 else 70)
        y = 4 + 20 + (i % 5) * 20
        pyxel.blt(x, y, 1,
          176 + i * 8, 8, 8, 8, CI_TR0)



    for card in self.cards:
      card.draw()

    self.keep.draw()
    for v in self.covers:
      v.draw()
    for v in self.effs:
      v.draw()

    # プレイヤーを描画
    self.player.draw()

    # メッセージ
    if self.game_mode == MODE_PLAY:
      #msg = "CLICK TO PLAY"
      #pyxel.text(W/2-len(msg)*2, MES_Y, msg, CI_MAINFONT)

      if self.first_gen:
        self.first_gen = False
        pyxel.gen_bgm(3, 0, 1, 1234, play=True)
        pyxel.channels[0].gain = self.gain
        pyxel.channels[1].gain = self.gain
        pyxel.channels[2].gain = self.gain

    elif self.game_mode == MODE_GAME_OVER:
      msg = "GAME OVER"
      px = W/2 - len(msg) * 2
      pyxel.rect(px - 2, MES_Y - 2, len(msg) * 4 + 2, 8, 8)
      pyxel.text(px, MES_Y, msg, CI_MAINFONT)
    elif self.game_mode == MODE_GAME_CLEAR:
      msg = "CLEAR!"
      px = W/2 - len(msg) * 2
      pyxel.rect(px - 2, MES_Y - 2, len(msg) * 4 + 2, 8, 1)
      pyxel.text(px, MES_Y, msg, CI_MAINFONT)     

    # スコアを描画
    pyxel.text(10, 4,
      "SCORE:{:04}".format(self.score), CI_MAINFONT)
    pyxel.text(60, 4,
      f'MISS:{self.miss}', CI_MAINFONT)

  def reset(self):
    """ ステージを初期化 """
    #global GAME_GENRE, GAME_NAME

    self.score = 0
    self.miss = 0
    self.fail_count = 0

    # カーソル
    self.player.x = 10
    self.player.y = 20 + 4 * 20

    if GAME_GENRE == GAME_NAME:
      self.set_card_by_phase()
    else:
      self.set_card()

  def control(self):
    """ コントロール """

    if self.game_mode == MODE_PLAY:
      self.play_control()


    abut = self.input_manager.fires[4]
    bbut = self.input_manager.fires[5]
    cbut = self.input_manager.fires[6]
    click = abut or bbut or cbut

    if click:
      # Title -> Play
      if self.game_mode == MODE_TITLE:
        self.game_mode = MODE_PLAY
        pyxel.play(CH_SE, 3)
        pyxel.reset()
        return

      # Game Over -> Title
      if self.game_mode == MODE_GAME_OVER:
        self.game_mode = MODE_TITLE

        # Reset
        pyxel.play(CH_SE, 3)
        self.reset()
        return

      if self.game_mode == MODE_GAME_CLEAR:
        self.game_mode = MODE_PLAY
        pyxel.play(CH_SE, 3)
        pyxel.reset()
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
      dbut = self.input_manager.fires[7]
      if abut or bbut or cbut:
        self.add_sel(sel)

      if dbut:
        self.reset()


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

      self.keep.visible = True
      self.keep.bx = add.bx
      self.keep.by = add.by
      self.keep.calc()
      return


    self.keep.visible = False
    # 通常チェック(任意ジョーカー無し)
    sels = [self.selected[0], self.selected[1]]

    sel_pair_ok = sels[0].num_equal(sels[1])
    ok = False

    # オープン救済。オープンがペアだった場合はオープン優先
    for i, v in enumerate(self.opened):
      if v.paired:
        continue

      if (not sels[0].num_equal(v)) and (not sels[1].num_equal(v)):
        continue


      # NOTE: オープンがペアだった場合はオープン優先
      if sel_pair_ok:
        if self.opened[0].num_equal(self.opened[1]):
          sel_pair_ok = False
        else:
          # 救済せず通常選択を優先
          continue


      ok = True
      # 非マッチは時間で閉じる
      index = 0 if sels[0].num_equal(v) else 1
      unmatch = 1 - index

      self.covers[i].visible = False

      for i2, v2 in enumerate((self.selected[index], v)):
        v.paired = True
        eff = self.effs[i2]
        eff.bx = v2.bx
        eff.by = v2.by
        eff.calc()
        eff.index = 24
        eff.timer = 45

      self.selected.pop(index)
      self.fail_count = 45
      break


    if sel_pair_ok:
      ok = True

      for i, v in enumerate(self.selected):
        v.paired = True
        eff = self.effs[i]
        eff.bx = v.bx
        eff.by = v.by
        eff.calc()
        eff.index = 24
        eff.timer = 45
      self.selected = []


    if ok:
      pyxel.play(CH_SE, SE_SUC)
      self.score += 100
    else:

      for i2, v2 in enumerate(self.selected):
        eff = self.effs[i2]
        eff.bx = v2.bx
        eff.by = v2.by
        eff.calc()
        eff.index = 26
        eff.timer = 45

      self.miss += 1
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
    for i, number in enumerate((1, 13, 12, 11, 10)):
      cur.pick(suit, number)
      cur.hands[9][i] = {"suit": suit, "number": number}

    # 8, ストレートフラッシュ ace は不可
    number = pyxel.rndi(5, 13)
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
    seq = list(range(2, 10))
    self.shuffle(seq)
    for n in seq:
      count = 0
      for j in (0, 1, 2, 3):
        count += 1 if cur.check(j, n) else 0
      if count < 4:
        continue

      for j in (0, 1, 2, 3):
        cur.pick(j, n)
        cur.hands[7][j] = {"suit": j, "number": n}
      break


    # ストレート
    nums = cur.count_number()
    # [5からHIGH_ACE]
    seq = list(range(5, HIGH_ACE + 1))
    self.shuffle(seq)
    st_ok = False
    for start_n in seq:
      sub = []
      exist_zero = False
      for j in range(5):
        num = nums[start_n - j]
        if num == 0:
          exist_zero = True
          break
        sub.append(num)
      if exist_zero:
        continue

      num_sum = sum(sub)

      pseq = []
      flash_suit = -11
      for j in range(5):
        n = start_n - j
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        for s in sseq:
          n = start_n - j
          if cur.check(s, n):
            pseq.append({"suit": s, "number": n})
            if flash_suit == -11:
              flash_suit = s
            elif flash_suit != s:
              flash_suit = -9
            break

      if num_sum == 5 and flash_suit >= 0:
        continue

      if flash_suit >= 0:
        # 入れ替える
        indices = [0, 1, 2, 3, 4]
        self.shuffle(indices)
        for i, index in enumerate(indices):
          if sub[index] < 2:
            continue
          target_n = start_n - index
          # 現在と違うスートに変更
          sseq = [0, 1, 2, 3]
          self.shuffle(sseq)
          for new_s in sseq:
            if new_s == pseq[index]["suit"]:
              continue
            if cur.check(new_s, target_n):
              pseq[index]["suit"] = new_s
              break
          break

      for i, v in enumerate(pseq):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[4][i] = {"suit": s, "number": n if n != HIGH_ACE else 1}
      st_ok = True
      break

    print(f'straight, {st_ok}')
    if not st_ok:
      print(f'phase, {cur}')



    # 6, フルハウスの3, 3, スリーカードの3
    seq = list(range(1, 14))
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


    # 0: ハイカード(1-1-1-1-1)
    nums = cur.count_number()
    high_ok = False
    for _ in range(10):
      seq = list(range(1, 14))
      self.shuffle(seq)

      pseq = []
      for n in seq:
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        for j in range(4):
          s = sseq[j]
          if cur.check(s, n):
            pseq.append({"suit": s, "number": n})
            break

      if len(pseq) < 5:
        continue

      pseq = pseq[:5]
      # フラッシュはNG
      count = 0
      for k in range(5):
        count += 1 if pseq[k]["suit"] == pseq[0]["suit"] else 0
      if count == 5:
        continue

      # ストレートはNG
      upper_d = max(pseq, key=lambda x: x["number"])
      lower_d = min(pseq, key=lambda x: x["number"])
      if upper_d["number"] - lower_d["number"] == 4:
        continue

      pseq.sort(reverse=True, key=lambda x: (3-x["suit"])+(x["number"] if x["number"]!=1 else HIGH_ACE)*10)
      for i, v in enumerate(pseq):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[0][i] = {"suit": s, "number": n}
      high_ok = True
      break


    print(f'high_ok, {high_ok}, rest, {cur.rest_num}, {cur}')
    # フラッシュ(5)
    flash_ok = False
    sseq = [0, 1, 2, 3]
    self.shuffle(sseq)
    for s in sseq:
      seq = list(range(1, 14))
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
      # ace は先頭へ
      if pseq[4] == 1:
        ace = pseq.pop(4)
        pseq.insert(0, ace)

      for i, n in enumerate(pseq):
        cur.pick(s, n)
        cur.hands[5][i] = {"suit": s, "number": n}
      flash_ok = True
      break

    print(f'flash_ok, {flash_ok}')

    # ツーペア(2-2-1)
    seq = list(range(1, 14))
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
    index = 0 if Card.dict_comp(cands[0][0], cands[1][0]) >= 0 else 1
    print(f'index, {index}, {cands[0][0]}, {cands[1][0]}')
    #index = 0 if cands[0][0]["number"] > cands[1][0]["number"] else 1
    pseq = [cands[index][0], cands[index][1], cands[1-index][0], cands[1-index][1]]

    # 2ペアの最後の1枚
    pair_ns = [pseq[0]["number"], pseq[2]["number"]]
    seq = list(range(1, 14))
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

    # ----

    # フルハウスの残りの1ペア ここがNGだった
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


    # ワンペア(1-3)
    one_ok = False
    for _ in range(10):
      seq = list(range(1, 14))
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
      noseq = list(range(1, 14))
      self.shuffle(noseq)
      nos = []
      for n in noseq:
        if n == pair_n:
          continue
        sseq = [0, 1, 2, 3]
        self.shuffle(sseq)
        for s in sseq:
          if cur.check(s, n):
            nos.append({"suit": s, "number": n})
            break

      if len(nos) < 3:
        continue
      nos = nos[:3]
      nos.sort(reverse=True, key=lambda x: (3-x["suit"])+(x["number"] if x["number"]!=1 else HIGH_ACE)*10)
      for v in nos:
        cands.append(v)

      for i, v in enumerate(cands):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[1][i] = {"suit": s, "number": n}
      one_ok = True
      break

    print(f'one_ok, {one_ok}')

    # スリーの残り(2)
    three_n = cur.hands[3][0]["number"]
    seq = list(range(1, 14))
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
      # 破壊降順ソート
      cands.sort(reverse=True, key=lambda x: (3-x["suit"])+10*(x["number"] if x["number"]!=1 else HIGH_ACE))
      for i, v in enumerate(cands):
        s = v["suit"]
        n = v["number"]
        cur.pick(s, n)
        cur.hands[3][i+3] = {"suit": s, "number": n}


    # フォーの残りとオープン(3)
    pseq = []
    for s in range(4):
      for n in range(1, 14):
        if not cur.check(s, n):
          continue
        pseq.append({"suit": s, "number": n})
        #cur.pick(s, n)

    if len(pseq) != 3:
      print(f'rest num {len(pseq)} is not 3')
      return None

    index = pyxel.rndi(0, 2)
    cur.hands[7][4] = pseq.pop(index)
    cur.pick(cur.hands[7][4]["suit"], cur.hands[7][4]["number"])

    pseq.sort(reverse=True, key=lambda x: (3-x["suit"])+(x["number"] if x["number"]!=1 else HIGH_ACE)*10)
    cur.anys = pseq

    print(cur)
    return cur

  def set_card_by_phase(self):

    for i in range(10):
      cur = self.create_phase()
      if cur:
        break
      print(f'failure {i}')


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
          card = Card(bx, by, v["suit"], v["number"])
          card.is_face = False
          cards.append(card)


    # オープン
    self.covers = []
    self.opened = []
    for i, v in enumerate(cur.anys):
      card = Card(7 + i, -1, v["suit"], v["number"])
      card.is_face = True
      cards.append(card)

      self.opened.append(card)

      cover = KeepSprite(card.bx, card.by, 30)
      self.covers.append(cover)

    self.cards = cards
    self.selected = []


def main():
    """ メイン処理 """
    Game()

if __name__ == "__main__":
    main()

