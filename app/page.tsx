const menuItems = [
  { name: "招牌牛肉面", category: "主食", price: 68, status: "热卖" },
  { name: "松露蘑菇意面", category: "主食", price: 88, status: "新品" },
  { name: "柠檬气泡茶", category: "饮品", price: 28, status: "在售" }
];

const inventory = [
  { item: "牛肉高汤", level: 18, unit: "L", warning: "明天需补货" },
  { item: "鲜蘑菇", level: 4, unit: "kg", warning: "库存偏低" },
  { item: "柠檬", level: 32, unit: "个", warning: "充足" }
];

const shifts = [
  { name: "Amy", role: "店长", time: "09:00 - 17:00" },
  { name: "Ben", role: "后厨", time: "10:00 - 21:00" },
  { name: "Cici", role: "前台", time: "12:00 - 22:00" }
];

const members = [
  { name: "李小姐", tag: "VIP", lastVisit: "今天", note: "喜欢低糖饮品" },
  { name: "王先生", tag: "新会员", lastVisit: "昨天", note: "午餐常客" }
];

export default function Home() {
  const revenue = 4680;
  const orders = 86;
  const averageOrder = Math.round(revenue / orders);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">手机后台 · Vercel Ready</p>
          <h1>DING BISTRO 数字化管理系统</h1>
          <p className="heroText">第一版聚合菜单、营业额、库存、会员、排班与营销文案，适合老板用手机快速查看与记录。</p>
        </div>
        <button className="primaryButton">今日概览</button>
      </section>

      <section className="metricsGrid" aria-label="今日经营概览">
        <article className="metricCard">
          <span>今日营业额</span>
          <strong>¥{revenue.toLocaleString()}</strong>
          <small>目标完成 78%</small>
        </article>
        <article className="metricCard">
          <span>订单数</span>
          <strong>{orders}</strong>
          <small>堂食 52 · 外卖 34</small>
        </article>
        <article className="metricCard">
          <span>客单价</span>
          <strong>¥{averageOrder}</strong>
          <small>较昨日 +6%</small>
        </article>
      </section>

      <div className="dashboardGrid">
        <section className="panel">
          <div className="panelHeader">
            <h2>菜单管理</h2>
            <button>新增菜品</button>
          </div>
          <div className="list">
            {menuItems.map((dish) => (
              <div className="listItem" key={dish.name}>
                <div>
                  <strong>{dish.name}</strong>
                  <span>{dish.category} · {dish.status}</span>
                </div>
                <b>¥{dish.price}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="panel revenuePanel">
          <div className="panelHeader">
            <h2>每日营业额记录</h2>
            <button>记一笔</button>
          </div>
          <form className="quickForm">
            <label>日期<input type="date" defaultValue="2026-07-04" /></label>
            <label>金额<input type="number" placeholder="输入今日营业额" /></label>
            <label>备注<textarea placeholder="例如：午市爆单，晚市雨天人少" /></label>
          </form>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>库存提醒</h2>
            <button>补货</button>
          </div>
          <div className="list">
            {inventory.map((stock) => (
              <div className="listItem" key={stock.item}>
                <div>
                  <strong>{stock.item}</strong>
                  <span>{stock.warning}</span>
                </div>
                <b>{stock.level}{stock.unit}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>会员记录</h2>
            <button>添加</button>
          </div>
          <div className="list">
            {members.map((member) => (
              <div className="memberCard" key={member.name}>
                <div className="avatar">{member.name.slice(0, 1)}</div>
                <div>
                  <strong>{member.name} · {member.tag}</strong>
                  <span>最近到店：{member.lastVisit} · {member.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>员工排班</h2>
            <button>排班</button>
          </div>
          <div className="timeline">
            {shifts.map((shift) => (
              <div className="shift" key={shift.name}>
                <span>{shift.time}</span>
                <strong>{shift.name}</strong>
                <em>{shift.role}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="panel aiPanel">
          <div className="panelHeader">
            <h2>营销文案生成</h2>
            <button>生成</button>
          </div>
          <div className="promptBox">
            <p>本周推荐：招牌牛肉面 + 柠檬气泡茶套餐</p>
            <blockquote>“今晚来 DING BISTRO，用一碗热气腾腾的招牌牛肉面治愈忙碌的一天。到店出示会员码，饮品第二杯半价。”</blockquote>
          </div>
        </section>
      </div>
    </main>
  );
}
