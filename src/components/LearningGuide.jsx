import { useI18n } from '../i18n.jsx';
import { guide, routeTopics, topicGuide } from '../lib/learning-guide.js';

export function LearningRoute({ topics }) {
  const { t } = useI18n();
  const route = routeTopics(topics);
  if (!route.length) return null;
  return (
    <section className="stack-14" aria-labelledby="learning-route-title">
      <h2 className="h2" id="learning-route-title">{t('เส้นทางแนะนำ ถ้ายังไม่รู้จะเริ่มตรงไหน', 'A suggested route if you are unsure where to start')}</h2>
      <p className="muted">{t('เรียนตามลำดับนี้เพื่อเชื่อมพื้นฐานกับงานจริง แต่ละหัวข้อบอกพื้นฐานที่ใช้และสิ่งที่ควรทำได้ ถ้าคุ้นแล้วข้ามไปหัวข้อที่ต้องการได้', 'Follow this order to connect the foundations to practical work. Each topic lists useful prerequisites and outcomes. Skip ahead if you already know the foundations.')}</p>
      <ol className="learning-route">
        {route.map((topic) => <li key={topic.id}><a className="link" href={'#/topic/' + topic.id}>{topic.title}</a></li>)}
      </ol>
    </section>
  );
}

export function TopicLearningGuide({ topic, topics }) {
  const { t, language } = useI18n();
  const entry = topicGuide(topic);
  if (!entry) return null;
  const prerequisites = entry.prerequisites.map((id) => topics.find((item) => item.id === id && !item.temp)).filter(Boolean);
  const jumpToReading = (index) => {
    const item = document.getElementById('reading-' + topic.id + '-' + index);
    if (!item) return;
    item.focus({ preventScroll: true });
    item.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  return (
    <section className="learning-guide stack-20" aria-labelledby="topic-guide-title">
      <h2 className="h3" id="topic-guide-title">{t('ก่อนเริ่มหัวข้อนี้', 'Before you start')}</h2>
      <div className="split align-start">
        <div className="stack-8">
          <h3 className="label-lg">{t('พื้นฐานที่ช่วยให้อ่านได้เข้าใจ', 'Useful foundations')}</h3>
          <p>{entry.readiness[language]}</p>
          {prerequisites.length > 0 && <ul className="guide-list">{prerequisites.map((item) => <li key={item.id}><a className="link" href={'#/topic/' + item.id}>{item.title}</a></li>)}</ul>}
        </div>
        <div className="stack-8">
          <h3 className="label-lg">{t('เมื่อเรียนแล้ว ควรทำได้', 'After studying, you should be able to')}</h3>
          <ul className="guide-list">{entry.outcomes[language].map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
        </div>
      </div>
      <div className="stack-8">
        <h3 className="label-lg">{t('อ่านสามเรื่องนี้ก่อน แล้วค่อยอ่านส่วนที่เหลือ', 'Read these three concepts first, then continue with the rest')}</h3>
        <ol className="guide-list">
          {entry.firstRead.filter((i) => topic.mustKnow[i]).map((i) => <li key={i}><button type="button" className="link" onClick={() => jumpToReading(i)}>{topic.mustKnow[i].title}</button></li>)}
        </ol>
      </div>
    </section>
  );
}

export function PracticalCapstone({ topics }) {
  const { t, language } = useI18n();
  const capstone = guide.capstone;
  return (
    <section className="learning-guide stack-14" aria-labelledby="capstone-title">
      <h2 className="h2" id="capstone-title">{t('ใช้ความรู้ร่วมกัน แล้วตรวจจากหลักฐาน', 'Combine your skills and review the evidence')}</h2>
      <p>{t('หลังอ่าน ลองทำโปรเจกต์รวมด้วยเครื่องมือของคุณเอง เกณฑ์นี้ใช้ตรวจด้วยตัวเองหรือให้เพื่อน review เว็บไม่รันโค้ด ไม่ให้คะแนนโปรเจกต์ และไม่บันทึกความคืบหน้า', 'After studying, try a capstone with your own tools. Use this rubric for self-review or peer review. This site does not execute code, grade projects, or save progress.')}</p>
      <details className="stack-14">
        <summary>{capstone.title[language]}</summary>
        <div className="stack-20 capstone-body">
          <p>{capstone.brief[language]}</p>
          <div className="stack-8">
            <h3 className="h3">{t('สิ่งที่ส่งให้ review', 'Deliverables for review')}</h3>
            <ul className="guide-list">{capstone.deliverables[language].map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="stack-12">
            <h3 className="h3">{t('เกณฑ์ตรวจด้วยคน', 'Manual review rubric')}</h3>
            <p className="muted small">{t('ระบุแต่ละข้อว่า มีหลักฐาน / ต้องแก้ / ยังไม่ได้ตรวจ งานพร้อม review เมื่อทุกข้อมีหลักฐานให้ไล่ตรวจได้ การอ่าน checklist หรือผ่าน regex ในเว็บยังไม่พิสูจน์ว่าโปรเจกต์ทำงานถูกต้อง', 'Mark each criterion: evidence supplied / needs revision / not checked. A project is ready for review when every criterion has traceable evidence. Reading this checklist or passing this site’s pattern checks does not establish project correctness.')}</p>
            <dl className="capstone-rubric">
              {capstone.rubric.map((item) => {
                const topic = topics.find((entry) => entry.id === item.topic && !entry.temp);
                return <div key={item.topic} className="stack-4"><dt>{item.criterion[language]}</dt><dd>{item.evidence[language]}{topic && <> <a className="link" href={'#/topic/' + topic.id}>{topic.title}</a></>}</dd></div>;
              })}
            </dl>
          </div>
        </div>
      </details>
    </section>
  );
}
