import { expect, test } from "@playwright/test";
import {
  approveMember,
  createGroup,
  devLogin,
  joinGroup,
} from "../helpers/api";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function apiRequest(
  path: string,
  method = "GET",
  token?: string,
  body?: unknown,
) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    body: await response.json().catch(() => ({})),
  };
}

test.describe("Clover 보안 및 권한 경계", () => {
  test("개인정보·모임 공지·피드백을 비권한 사용자에게 노출하지 않는다", async () => {
    const president = await devLogin("보안테스트회장");
    const outsider = await devLogin("보안테스트외부인");
    const group = await createGroup(president.accessToken, {
      name: "보안 테스트 모임",
      description: "권한 테스트용 모임",
      category: "IT/개발",
      isPublic: true,
    });

    const groupResponse = await apiRequest(
      `/groups/${group.id}`,
      "GET",
      outsider.accessToken,
    );
    expect(groupResponse.status).toBe(200);
    expect(groupResponse.body.members[0].user.phoneNumber).toBeUndefined();

    const profileResponse = await apiRequest(
      `/auth/users/${president.user.id}`,
      "GET",
      outsider.accessToken,
    );
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.phoneNumber).toBeNull();
    expect(profileResponse.body.kakaoId).toBeUndefined();

    const announcementResponse = await apiRequest(
      "/announcements",
      "POST",
      president.accessToken,
      {
        title: "회원 전용 공지",
        content: "외부인에게는 보이면 안 됩니다.",
        groupId: group.id,
      },
    );
    expect(announcementResponse.status).toBe(201);

    const listResponse = await apiRequest(
      `/announcements?groupId=${group.id}`,
      "GET",
      outsider.accessToken,
    );
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual([]);

    const detailResponse = await apiRequest(
      `/announcements/${announcementResponse.body.id}`,
      "GET",
      outsider.accessToken,
    );
    expect(detailResponse.status).toBe(403);

    const feedbackResponse = await apiRequest("/feedback");
    expect(feedbackResponse.status).toBe(401);
  });

  test("정원 초과 승인과 비밀 없는 개발 알림 실행을 차단한다", async () => {
    const president = await devLogin("정원테스트회장");
    const member = await devLogin("정원테스트회원");
    const overflowMember = await devLogin("정원테스트초과회원");
    const group = await createGroup(president.accessToken, {
      name: "정원 2명 모임",
      description: "정원 제한 테스트용 모임",
      category: "IT/개발",
      isPublic: true,
      maxMembers: 2,
    });

    await joinGroup(member.accessToken, group.id);
    await approveMember(president.accessToken, group.id, member.user.id);
    await joinGroup(overflowMember.accessToken, group.id);

    const approval = await apiRequest(
      `/groups/${group.id}/members/${overflowMember.user.id}`,
      "PATCH",
      president.accessToken,
      { status: "APPROVED" },
    );
    expect(approval.status).toBe(400);
    expect(approval.body.message).toContain("정원");

    const developmentEndpoint = await apiRequest(
      "/notifications/dev/trigger-reminders",
      "POST",
    );
    expect(developmentEndpoint.status).toBe(403);
  });
});
