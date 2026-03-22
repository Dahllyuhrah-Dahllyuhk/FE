export const metadata = {
  title: '개인정보처리방침 | 맞춰봄',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">개인정보처리방침</h1>
      <p className="text-muted-foreground mb-8 text-xs">시행일: 2025년 3월 21일</p>

      <p className="mb-6">
        맞춰봄(이하 "서비스")은 개인정보보호법 제30조에 따라 이용자의 개인정보를 보호하고
        이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이
        개인정보처리방침을 수립·공개합니다.
      </p>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">1. 수집하는 개인정보 항목 및 수집 방법</h2>
        <p className="mb-2">서비스는 소셜 로그인(Kakao, Google) 과정에서 아래 항목을 수집합니다.</p>
        <table className="w-full border-collapse text-xs mb-3">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border px-3 py-2 text-left">수집 경로</th>
              <th className="border border-border px-3 py-2 text-left">수집 항목</th>
              <th className="border border-border px-3 py-2 text-left">수집 목적</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border px-3 py-2">카카오 로그인</td>
              <td className="border border-border px-3 py-2">카카오 회원번호(고유 식별자), 닉네임, 프로필 이미지</td>
              <td className="border border-border px-3 py-2">회원 식별 및 프로필 표시</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Google 로그인</td>
              <td className="border border-border px-3 py-2">이메일 주소, 프로필 이미지</td>
              <td className="border border-border px-3 py-2">Google Calendar 연동 인증</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Google Calendar 연동</td>
              <td className="border border-border px-3 py-2">일정 제목, 시작/종료 시각</td>
              <td className="border border-border px-3 py-2">모임 가용 시간 분석 (해당 사용자에게만 제공)</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground">
          * Google Calendar 데이터는 해당 사용자의 모임 일정 조율 기능 제공에만 사용되며,
          Google API Services User Data Policy를 준수합니다.
          수집된 캘린더 데이터는 제3자와 공유되지 않습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">2. 개인정보의 수집·이용 목적</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>회원 식별 및 서비스 로그인</li>
          <li>모임 일정 조율을 위한 가용 시간 분석</li>
          <li>친구 초대 및 모임 참여 기능 제공</li>
          <li>서비스 운영 및 고지사항 전달</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">3. 개인정보의 보유·이용 기간</h2>
        <p className="mb-2">
          개인정보는 수집·이용 목적이 달성된 후 지체 없이 파기합니다.
          단, 관계 법령에 따라 아래와 같이 보관합니다.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>회원 탈퇴 시: 즉시 파기 (단, 분쟁 해결을 위해 필요한 경우 해결 시까지 보관)</li>
          <li>전자상거래 등에서의 소비자 보호에 관한 법률: 계약/청약 철회 기록 5년</li>
          <li>통신비밀보호법: 로그인 기록 3개월</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">4. 개인정보의 제3자 제공</h2>
        <p>
          서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
          다만, 이용자의 사전 동의가 있거나 법령에 의한 경우에는 예외입니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">5. 개인정보 처리 위탁</h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border px-3 py-2 text-left">수탁업체</th>
              <th className="border border-border px-3 py-2 text-left">위탁 업무</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border px-3 py-2">Kakao Corp.</td>
              <td className="border border-border px-3 py-2">소셜 로그인 인증 처리</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Google LLC</td>
              <td className="border border-border px-3 py-2">Google Calendar API 연동, 클라우드 인프라(Google Cloud)</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Amazon Web Services</td>
              <td className="border border-border px-3 py-2">클라우드 서버 및 데이터베이스 운영</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">6. 이용자의 권리 및 행사 방법</h2>
        <p className="mb-2">이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>개인정보 열람 요청</li>
          <li>오류 정정 요청</li>
          <li>삭제 요청 (회원 탈퇴를 통해 즉시 처리)</li>
          <li>처리 정지 요청</li>
        </ul>
        <p className="mt-2">
          권리 행사는 서비스 내 설정 &gt; 회원 탈퇴 또는 아래 개인정보 보호 담당자에게
          이메일로 요청하실 수 있습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">7. 만 14세 미만 이용 제한</h2>
        <p>
          서비스는 만 14세 미만 아동의 개인정보를 수집하지 않습니다.
          만 14세 미만인 경우 서비스 이용이 제한됩니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">8. 개인정보의 안전성 확보 조치</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>OAuth 토큰 AES-256 암호화 저장</li>
          <li>HTTPS 통신 암호화</li>
          <li>접근 권한 최소화</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">9. 개인정보 보호 담당자</h2>
        <ul className="list-none space-y-1">
          <li>성명: 문성현</li>
          <li>
            이메일:{' '}
            <a href="mailto:tjgus9139@gmail.com" className="underline">
              tjgus9139@gmail.com
            </a>
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          개인정보 침해 신고: 개인정보 침해신고센터 (privacy.kisa.or.kr / ☎ 118)
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">10. 개인정보처리방침 변경</h2>
        <p>
          본 방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며,
          변경 시 시행 7일 전에 서비스 내 공지를 통해 안내합니다.
        </p>
      </section>
    </main>
  );
}
