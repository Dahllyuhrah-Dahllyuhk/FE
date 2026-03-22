export const metadata = {
  title: '이용약관 | 맞춰봄',
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">이용약관</h1>
      <p className="text-muted-foreground mb-8 text-xs">시행일: 2025년 3월 21일</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제1조 (목적)</h2>
        <p>
          본 약관은 맞춰봄(이하 "서비스")이 제공하는 모임 일정 조율 서비스의
          이용 조건, 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을
          규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제2조 (정의)</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>"서비스"란 맞춰봄이 제공하는 모임 일정 조율 웹 애플리케이션을 의미합니다.</li>
          <li>"이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 의미합니다.</li>
          <li>"모임"이란 이용자들이 공동으로 일정을 조율하기 위해 생성하는 그룹을 의미합니다.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제3조 (약관의 효력 및 변경)</h2>
        <p className="mb-2">
          본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.
        </p>
        <p>
          서비스는 필요 시 약관을 변경할 수 있으며, 변경된 약관은 시행 7일 전에 공지합니다.
          이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제4조 (이용 자격)</h2>
        <p className="mb-2">다음 조건을 충족하는 자에 한하여 서비스를 이용할 수 있습니다.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>만 14세 이상인 자</li>
          <li>Kakao 또는 Google 계정을 보유한 자</li>
          <li>본 약관 및 개인정보처리방침에 동의한 자</li>
          <li>이전에 서비스 이용 제한을 받지 않은 자</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제5조 (서비스 제공)</h2>
        <p className="mb-2">서비스는 다음 기능을 제공합니다.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Google Calendar 연동을 통한 가용 시간 자동 분석</li>
          <li>친구 초대 및 모임 일정 조율</li>
          <li>모임 확정 시 참여자 캘린더 일정 자동 등록</li>
          <li>주간 시간표 등록 및 관리</li>
        </ul>
        <p className="mt-2">
          서비스는 연중무휴 24시간 제공을 원칙으로 하나, 시스템 점검·장애·운영상 필요에 의해
          일시 중단될 수 있으며 이 경우 사전 또는 사후에 공지합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제6조 (이용자의 의무)</h2>
        <p className="mb-2">이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
          <li>다른 이용자에게 불쾌감을 주거나 피해를 끼치는 행위</li>
          <li>서비스를 상업적 목적으로 무단 이용하는 행위</li>
          <li>관계 법령 및 본 약관을 위반하는 행위</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제7조 (서비스 이용 제한)</h2>
        <p>
          서비스는 이용자가 제6조의 의무를 위반하거나 서비스의 정상적인 운영을 방해하는 경우
          사전 통보 없이 이용을 제한할 수 있습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제8조 (회원 탈퇴 및 데이터 삭제)</h2>
        <p>
          이용자는 언제든지 서비스 내 설정 메뉴를 통해 회원 탈퇴를 요청할 수 있습니다.
          탈퇴 즉시 모든 개인정보 및 서비스 데이터(모임, 일정, 친구 관계 등)가 삭제되며
          복구할 수 없습니다. 단, 관계 법령에 따라 보존이 필요한 정보는 해당 기간 동안 보관됩니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제9조 (서비스의 책임 한계)</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 인한
            서비스 제공 불가 시 책임을 지지 않습니다.
          </li>
          <li>
            서비스는 이용자가 제공한 정보의 정확성, 모임 일정 조율 결과의 완전성에 대해
            보증하지 않습니다.
          </li>
          <li>
            서비스는 이용자 간의 분쟁에 개입하지 않으며, 이로 인한 손해를 책임지지 않습니다.
          </li>
          <li>
            Google Calendar 연동 기능은 Google의 정책 변경에 따라 일부 기능이 변경되거나
            중단될 수 있습니다.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제10조 (지식재산권)</h2>
        <p>
          서비스가 제공하는 콘텐츠, UI 디자인, 소프트웨어 등에 대한 지식재산권은
          서비스에 귀속됩니다. 이용자는 서비스의 사전 동의 없이 이를 복제·배포·수정할 수 없습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">제11조 (준거법 및 관할법원)</h2>
        <p>
          본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련한 분쟁은
          민사소송법상 관할 법원을 제1심 관할 법원으로 합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">부칙</h2>
        <p>본 약관은 2025년 3월 21일부터 시행합니다.</p>
      </section>
    </main>
  );
}
