# 2D

import pyxel
import math
import random

W, H = 160, 120

START_X = W / 2 - 48
START_Y = H / 2 - 12

MODE_TITLE = "title"
MODE_PLAY = "play"
MODE_GAME_OVER = "game_over"

TUNNEL_TOTAL = 48

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

class PlayerSprite(BaseSprite):

    def __init__(self, x, y):
        """ コンストラクタ """
        super().__init__(x, y)
        self.gravity = 0.4 # 重力
        self.jump_x = 1.0 # ジャンプx
        self.jump_y = -3.4 # ジャンプy

    def update(self):
        """ 更新処理 """
        super().update()
        self.vy += self.gravity # Gravity

    def draw(self):
        """ 描画処理 """
        pyxel.blt(self.x, self.y, 0, 
            0, 16, self.w, self.h, 0)
        # Debug
        #pyxel.rectb(self.x, self.y, self.w, self.h, 3)

    def jump(self):
        """ ジャンプ """
        self.vx = self.jump_x # ジャンプx
        self.vy = self.jump_y # ジャンプy

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
        # Mid
        for i in range(self.length-2):
            y = self.y + (i+1)*8
            pyxel.blt(self.x, y, 0, 
                16, 24, self.w, 8, 0)
        # Bottom
        y = self.y + (self.length-1)*8
        pyxel.blt(self.x, y, 0, 
            16, 32, self.w, 8, 0)
        # Debug
        #pyxel.rectb(self.x, self.y, self.w, self.h, 3)

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

        # ステージを初期化
        self.reset()

        # Pyxelの起動
        pyxel.init(W, H, title="Hello, Pyxel!!")
        pyxel.load("my_resource.pyxres")
        pyxel.run(self.update, self.draw)

    def update(self):
        """ 更新処理 """

        # スコアを更新
        self.score = int(self.player.x - START_X)

        # コントロール
        self.control()

        # プレイ中判定
        if self.game_mode != MODE_PLAY: return

        # プレイヤーを更新
        self.player.update()

        # トンネルを更新
        for tunnel in self.tunnels:
            tunnel.update()
            if(tunnel.intersects(self.player)):
                self.game_mode = MODE_GAME_OVER
                break

        # 落下判定
        if H < self.player.y: 
            self.game_mode = MODE_GAME_OVER

    def draw(self):
        """ 描画処理 """
        pyxel.cls(6)

        # タイルマップ
        pyxel.bltm(0, 0, 0, 0, 0, 192, 128, 0)

        # カメラ(セット)
        pyxel.camera(self.player.x - START_X, 0)

        # プレイヤーを描画
        self.player.draw()

        # トンネルを描画
        for tunnel in self.tunnels:
            tunnel.draw()

        pyxel.camera() # カメラ(リセット)

        # メッセージ
        if self.game_mode == MODE_TITLE:
            msg = "SPACE TO PLAY"
            pyxel.text(W/2-len(msg)*2, H/2, msg, 1)
        elif self.game_mode == MODE_GAME_OVER:
            msg = "GAME OVER"
            pyxel.text(W/2-len(msg)*2, H/2, msg, 1)

        # スコアを描画
        pyxel.text(10, 10, 
            "SCORE:{:04}".format(self.score), 1)

    def reset(self):
        """ ステージを初期化 """

        # プレイヤー
        self.player.x = START_X
        self.player.y = START_Y

        # トンネル
        self.tunnels = []
        for i in range(TUNNEL_TOTAL):
            pad_x = 42
            pad_y = random.randint(2, 3) * 8
            x = START_X + pad_x * i + 32
            y = H / 2 + random.randint(-2, 2) * 8
            t_top = TunnelSprite(x, y-pad_y, 10, True)
            self.tunnels.append(t_top)
            t_bottom = TunnelSprite(x, y+pad_y, 10)
            self.tunnels.append(t_bottom)

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

        # ジャンプ
        if self.game_mode == MODE_PLAY:
            self.player.jump()

def main():
    """ メイン処理 """
    Game()

if __name__ == "__main__":
    main()


