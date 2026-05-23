# Software Empire Economy Balance Table (8-Hour Workday / 40% Salary Ratio)

# Economy Curve

| Level | Daily SP | 🔴 Production Low | 🟢 Production Normal | 🔵 Production High | 🔴 Salary Low | 🟢 Salary Normal | 🔵 Salary High | 🔴 Hourly Low | 🟢 Hourly Normal | 🔵 Hourly High |
|------|-----------|-------------------|----------------------|--------------------|----------------|-------------------|----------------|----------------|-------------------|----------------|
| Lv 1 | 16  | $1,280  | $1,600  | $1,920  | $512   | $640   | $768   | $10/h  | $12/h  | $14/h  |
| Lv 2 | 32  | $2,560  | $3,200  | $3,840  | $1,024 | $1,280 | $1,536 | $14/h  | $18/h  | $22/h  |
| Lv 3 | 64  | $5,120  | $6,400  | $7,680  | $2,048 | $2,560 | $3,072 | $20/h  | $25/h  | $30/h  |
| Lv 4 | 96  | $7,680  | $9,600  | $11,520 | $3,072 | $3,840 | $4,608 | $28/h  | $35/h  | $42/h  |
| Lv 5 | 144 | $11,520 | $14,400 | $17,280 | $4,608 | $5,760 | $6,912 | $38/h  | $48/h  | $58/h  |
| Lv 6 | 192 | $15,360 | $19,200 | $23,040 | $6,144 | $7,680 | $9,216 | $52/h  | $65/h  | $78/h  |
| Lv 7 | 256 | $20,480 | $25,600 | $30,720 | $8,192 | $10,240 | $12,288 | $68/h  | $85/h  | $102/h |
| Lv 8 | 336 | $26,880 | $33,600 | $40,320 | $10,752 | $13,440 | $16,128 | $88/h  | $110/h | $132/h |
| Lv 9 | 448 | $35,840 | $44,800 | $53,760 | $14,336 | $17,920 | $21,504 | $116/h | $145/h | $174/h |
| Lv 10 | 576 | $46,080 | $57,600 | $69,120 | $18,432 | $23,040 | $27,648 | $152/h | $190/h | $228/h |

---

This table represents the baseline economic balancing curve for employee progression in **Software Empire**.

The values are based on:

- 8-hour workday
- 16 WORK periods per day
- Base SP (Story Point) production table
- Temporary normalization:
  - `1 SP = $100 production value`
- Salary target:
  - `40% of production value`

The table includes:
- Low-value market conditions (80%)
- Normal market conditions (100%)
- High-value market conditions (120%)

These ranges help simulate:
- Cheap contracts
- Competitive markets
- Premium clients
- Economic fluctuations
- Project quality differences

---

## Base SP Table

```js
[0, 1, 2, 4, 6, 9, 12, 16, 21, 28, 36]
```

---



# Formula Reference

## Daily Story Points

```text
Daily SP = SP_PER_WORK_PERIOD × 16
```

---

## Production Value

```text
Production Value = Daily SP × SP_VALUE
```

Current normalization:

```text
SP_VALUE = $100
```

---

## Market Variation

```text
Low Market Value  = Base × 0.80
Normal Market Value = Base × 1.00
High Market Value = Base × 1.20
```

These simulate:
- Weak market conditions
- Difficult clients
- Premium contracts
- High-demand technologies

---

## Suggested Salary

```text
Salary = Production Value × 0.40
```

This leaves room for:
- Office expenses
- Profit margins
- Failed projects
- Bonuses
- Expansion
- Research systems

---

# Balancing Philosophy

SP represents:
- Work complexity
- Production throughput

Money represents:
- Market value
- Business profitability
- Economic pressure

These systems should remain partially separated to keep the economy healthy and scalable.
