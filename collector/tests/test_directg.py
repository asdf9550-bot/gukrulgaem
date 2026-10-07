import unittest

from collector import directg

SAMPLE = """
<meta property="og:title" content="테스트 게임" />
<p>대한민국 외 국가에서는 제품코드(키) 등록 및 플레이가 불가합니다.</p>
<img src="/assets/images/platform/steam.svg?1">
<div class="section-title">기본게임</div>
<div class="card p-0 mb-0"><h5 class="card-title fs-5 p-2 mb-0">테스트 게임</h5>
<span class="fs-5 badge minus">30 %</span>
<s class="old-price won"> 10,000</s><span class="current-price won"> 7,000</span>
<button class="btn_cart" data-sku="sku-1" data-name="테스트 게임" data-price="7000"></button></div>
<div class="section-title">에디션</div>
<div class="card p-0 mb-0"><h5 class="card-title">테스트 게임 디럭스 에디션</h5>
<span class="current-price won"> 12,000</span><button class="btn_cart" data-sku="sku-2"></button></div>
<div class="section-title">언어지원</div><span class="badge">자막 한국어</span><span class="badge">독점 한국어지원</span>
<img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/123456/extras/a.jpg">
"""


class ParseTest(unittest.TestCase):
    def test_parse(self):
        p = directg.parse(SAMPLE, "pid")
        self.assertEqual(p["title"], "테스트 게임")
        self.assertEqual(p["base"][0], {"name": "테스트 게임", "price": 7000, "regular": 10000, "cut": 30, "sku": "sku-1"})
        self.assertEqual(p["editions"][0]["name"], "테스트 게임 디럭스 에디션")
        self.assertEqual(p["editions"][0]["price"], 12000)
        self.assertEqual(p["appid_hint"], 123456)
        self.assertEqual(p["region_lock"], "kr")
        self.assertTrue(p["korean"]["exclusive"])
        self.assertEqual(p["platform"], "steam")

    def test_norm_and_edition(self):
        self.assertEqual(directg.norm("Sid Meier’s Civilization® VI"), directg.norm("sid meiers civilization 6"))
        self.assertTrue(directg.is_edition("호그와트 레거시 디럭스 에디션"))
        self.assertFalse(directg.is_edition("호그와트 레거시"))


class MatchTest(unittest.TestCase):
    def test_link_title_queue(self):
        games = [{"appid": 1, "name": "테스트 게임"}, {"appid": 2, "name": "다른 게임"}, {"appid": 3, "name": "다른 게임 2"}]
        products = {
            "a": {"product_id": "a", "url": "u", "title": "테스트 게임", "platform": "steam", "appid_hint": 1, "region_lock": "kr",
                  "korean": {"exclusive": True}, "base": [{"name": "테스트 게임", "price": 7000, "regular": 10000, "cut": 30}], "editions": []},
            "b": {"product_id": "b", "url": "u", "title": "다른 게임", "platform": "steam", "appid_hint": None, "region_lock": "kr",
                  "korean": {}, "base": [{"name": "다른 게임", "price": 5000, "regular": 5000, "cut": 0}], "editions": []},
            "c": {"product_id": "c", "url": "u", "title": "다른 게임 3", "platform": "steam", "appid_hint": None, "region_lock": "kr",
                  "korean": {}, "base": [{"name": "다른 게임 3", "price": 5000, "regular": 5000, "cut": 0}], "editions": []},
            "d": {"product_id": "d", "url": "u", "title": "테스트 게임 디럭스 에디션", "platform": "steam", "appid_hint": 1, "region_lock": "kr",
                  "korean": {}, "base": [{"name": "테스트 게임 디럭스 에디션", "price": 12000, "regular": 12000, "cut": 0}], "editions": []},
        }
        offers, queue = directg.match(products, games, {})
        self.assertEqual([(o["appid"], o["matched_by"]) for o in offers], [(1, "link"), (2, "title")])
        self.assertTrue(offers[0]["korean_only_here"])
        self.assertEqual([q["product_id"] for q in queue], ["c"])     # 비슷하지만 확실치 않음 → 대기
        self.assertEqual(queue[0]["status"], "pending")


if __name__ == "__main__":
    unittest.main()
