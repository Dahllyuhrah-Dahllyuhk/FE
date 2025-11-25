'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';

import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LegacyTimeRangeSelector } from '@/components/time-range-selector';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { createMeeting, fetchFriends, type FriendDto } from '@/lib/api';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(1, '모임 이름을 입력해주세요.'),
  dateRange: z.object({
    from: z.date({ required_error: '시작 날짜를 선택해주세요.' }),
    to: z.date({ required_error: '종료 날짜를 선택해주세요.' }),
  }),
  isAllDay: z.boolean().default(false),
  timeConstraints: z
    .array(
      z.object({
        startTime: z
          .string()
          .regex(
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            '올바른 시간 형식이 아닙니다 (HH:mm)'
          ),
        endTime: z
          .string()
          .regex(
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            '올바른 시간 형식이 아닙니다 (HH:mm)'
          ),
      })
    )
    .default([{ startTime: '09:00', endTime: '18:00' }]),
  invitedUserIds: z
    .array(z.string())
    .min(1, '최소 1명의 친구를 초대해야 합니다.'),
  reflectTimetable: z.boolean().default(true),
  reflectCalendar: z.boolean().default(true),
});

export default function CreateMeetingPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      isAllDay: false,
      timeConstraints: [{ startTime: '09:00', endTime: '18:00' }],
      invitedUserIds: [],
      reflectTimetable: true,
      reflectCalendar: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'timeConstraints',
  });

  const isAllDay = form.watch('isAllDay');

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const data = await fetchFriends();
        setFriends(data);
      } catch (error) {
        console.error('Failed to fetch friends', error);
        toast({
          title: '친구 목록 로드 실패',
          description: '친구 목록을 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingFriends(false);
      }
    };
    loadFriends();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createMeeting({
        name: values.name,
        invitedUserIds: values.invitedUserIds,
        requirement: {
          dateRangeStart: format(values.dateRange.from, 'yyyy-MM-dd'),
          dateRangeEnd: format(values.dateRange.to, 'yyyy-MM-dd'),
          isAllDay: values.isAllDay,
          timeConstraints: values.isAllDay ? [] : values.timeConstraints ?? [],
        },
        defaultReflectTimetable: values.reflectTimetable, // requirement 밖으로 이동
        defaultReflectCalendar: values.reflectCalendar, // requirement 밖으로 이동
      });

      toast({
        title: '모임 생성 완료',
        description: '새로운 모임이 생성되었습니다.',
      });
      router.push('/meetings');
    } catch (error) {
      console.error('Failed to create meeting', error);
      toast({
        title: '모임 생성 실패',
        description: '모임을 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <X className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              새 모임 만들기
            </h1>
          </div>
        </header>

        <main className="flex-1 p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>모임 이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: 주간 회의, 저녁 식사"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>날짜 범위</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value?.from ? (
                              field.value.to ? (
                                <>
                                  {format(field.value.from, 'PPP', {
                                    locale: ko,
                                  })}{' '}
                                  -{' '}
                                  {format(field.value.to, 'PPP', {
                                    locale: ko,
                                  })}
                                </>
                              ) : (
                                format(field.value.from, 'PPP', { locale: ko })
                              )
                            ) : (
                              <span>날짜를 선택하세요</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                          locale={ko} // Added Korean locale
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      모임을 가질 수 있는 후보 날짜 범위를 선택하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAllDay"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">하루 종일</FormLabel>
                      <FormDescription>
                        시간 제약 없이 날짜만 정합니다.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isAllDay && (
                <div className="space-y-4">
                  <FormLabel className="text-base">시간 제약</FormLabel>
                  <FormDescription>
                    드래그하여 모임이 가능한 시간대를 설정하세요.
                  </FormDescription>

                  <div className="space-y-6">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="relative p-4 rounded-lg border border-border bg-card"
                      >
                        <div className="max-h-[400px] overflow-y-auto">
                          <LegacyTimeRangeSelector
                            startTime={form.watch(
                              `timeConstraints.${index}.startTime`
                            )}
                            endTime={form.watch(
                              `timeConstraints.${index}.endTime`
                            )}
                            onStartTimeChange={(time: string) =>
                              form.setValue(
                                `timeConstraints.${index}.startTime`,
                                time
                              )
                            }
                            onEndTimeChange={(time: string) =>
                              form.setValue(
                                `timeConstraints.${index}.endTime`,
                                time
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="invitedUserIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">친구 초대</FormLabel>
                      <FormDescription>
                        함께할 친구를 선택하세요.
                      </FormDescription>
                    </div>
                    {isLoadingFriends ? (
                      <div className="text-sm text-muted-foreground">
                        친구 목록을 불러오는 중...
                      </div>
                    ) : friends.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        초대할 친구가 없습니다.
                      </div>
                    ) : (
                      <ScrollArea className="h-[200px] rounded-md border p-4">
                        <div className="space-y-4">
                          {friends.map((friend) => (
                            <FormField
                              key={friend.id}
                              control={form.control}
                              name="invitedUserIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={friend.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(
                                          friend.id
                                        )}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([
                                                ...field.value,
                                                friend.id,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== friend.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer w-full">
                                      {friend.nickname}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium">일정 반영 설정</h3>
                <FormField
                  control={form.control}
                  name="reflectTimetable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>내 시간표 반영</FormLabel>
                        <FormDescription>
                          내 주간 시간표의 수업 시간을 자동으로 '불가능'으로
                          설정합니다.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reflectCalendar"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>내 캘린더 일정 반영</FormLabel>
                        <FormDescription>
                          내 캘린더에 등록된 일정이 있는 시간을 자동으로
                          '불가능'으로 설정합니다.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                모임 만들기
              </Button>
            </form>
          </Form>
        </main>
      </div>
    </ProtectedRoute>
  );
}
