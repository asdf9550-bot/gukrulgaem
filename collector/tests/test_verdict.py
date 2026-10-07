import unittest

from collector import verdict
from collector.steam_store import adult_reason, korean_support
from collector.common import display_title

RULES = {"min_sales_for_verdict": 2, "good_price_cheaper_pct": 5, "wait_pricier_pct": 5, "trap_pricier_pct": 20,
         "korea_warning_gap_pp": 10, "korea_warning_min_reviews": 100}


def sales(*cuts):
    """세일 시작(cut)·종료(0)가 번갈아 나오는 가격 기록을 만든다."""
    history = []
    for cut in cuts:
        history.append({"cut": cut, "price": 100 - cut})
        history.append({"cut": 0, "price": 100})
    return history


class VerdictTest(unittest.TestCase):
    def test_sale_count_counts_starts_only(self):
        history = [{"cut": 0}, {"cut": 50}, {"cut": 50}, {"cut": 0}, {"cut": 30}, {"cut": 0}]
        self.assertEqual(verdict.sale_cuts(history), [50, 30])

    def test_fewer_than_two_sales_means_no_verdict(self):
        out = verdict.price_verdict(5000, 10000, 4000, sales(50), RULES)
        self.assertEqual(out["verdict"], "none")

    def test_floor_when_at_or_below_historical_low(self):
        out = verdict.price_verdict(4000, 10000, 4000, sales(50, 60), RULES)
        self.assertEqual(out["verdict"], "floor")

    def test_good_when_cheaper_than_usual(self):
        # 평소 세일가 = 중앙값 50% → 5,000원. 4,500원은 10% 쌈.
        out = verdict.price_verdict(4500, 10000, 4000, sales(50, 50), RULES)
        self.assertEqual(out["verdict"], "good")
        self.assertEqual(out["usual_sale_price"], 5000)

    def test_normal_near_usual(self):
        out = verdict.price_verdict(5100, 10000, 4000, sales(50, 50), RULES)
        self.assertEqual(out["verdict"], "normal")

    def test_wait_when_pricier(self):
        out = verdict.price_verdict(5600, 10000, 4000, sales(50, 50), RULES)
        self.assertEqual(out["verdict"], "wait")

    def test_trap_when_much_pricier(self):
        out = verdict.price_verdict(6500, 10000, 4000, sales(50, 50), RULES)
        self.assertEqual(out["verdict"], "trap")

    def test_free_or_unknown_price_no_verdict(self):
        self.assertEqual(verdict.price_verdict(None, 10000, 4000, sales(50, 50), RULES)["verdict"], "none")
        self.assertEqual(verdict.price_verdict(0, 0, None, sales(50, 50), RULES)["verdict"], "none")

    def test_korea_warning_tag(self):
        self.assertEqual(verdict.tags(-12.0, 150, RULES), ["korea_warning"])
        self.assertEqual(verdict.tags(-12.0, 50, RULES), [])
        self.assertEqual(verdict.tags(-5.0, 150, RULES), [])
        self.assertEqual(verdict.tags(None, 150, RULES), [])


class ParseTest(unittest.TestCase):
    def test_korean_support(self):
        self.assertEqual(korean_support("영어<strong>*</strong>, 한국어<strong>*</strong>, 일본어"), "voice_sub")
        self.assertEqual(korean_support("영어<strong>*</strong>, 한국어, 일본어"), "sub")
        self.assertEqual(korean_support("영어<strong>*</strong>, 일본어<br><strong>*</strong>음성 지원 언어"), "none")
        self.assertEqual(korean_support(""), "none")

    def test_adult_filter(self):
        rules = {"exclude_content_descriptors": [3, 4]}
        self.assertIsNone(adult_reason({"content_descriptors": [1, 2, 5]}, rules))     # 사이버펑크 수준은 남김
        self.assertIsNotNone(adult_reason({"content_descriptors": [1, 4]}, rules))
        self.assertIsNotNone(adult_reason({"content_descriptors": [3]}, rules))
        self.assertIsNone(adult_reason({}, rules))

    def test_display_title(self):
        self.assertEqual(display_title("Palworld / 팰월드"), "팰월드")
        self.assertEqual(display_title("Sid Meier’s Civilization® VI"), "Sid Meier’s Civilization 6")
        self.assertEqual(display_title("Mega Man X"), "Mega Man X")


if __name__ == "__main__":
    unittest.main()
