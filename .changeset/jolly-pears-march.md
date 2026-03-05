---
"pesafy": patch
---

The payload was always sending BillRefNumber: request.billRefNumber ?? "". For CustomerBuyGoodsOnline, Daraja treats any BillRefNumber field — even "" — as an invalid AccountReference and rejects the request (400 or 503). The fix conditionally includes the field only for Paybill
