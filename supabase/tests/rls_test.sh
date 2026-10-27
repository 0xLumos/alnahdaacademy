#!/usr/bin/env bash
# Runs the migration on a throwaway Postgres and checks each access rule.
# Usage: PGHOST=... PGPORT=... ./rls_test.sh
set -u
DB=nahda_rls_test
dropdb --if-exists "$DB" >/dev/null; createdb "$DB"
DIR="$(cd "$(dirname "$0")" && pwd)"
psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/stub_supabase.sql" >/dev/null
psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0001_schema.sql" >/dev/null || { echo "MIGRATION FAILED"; exit 1; }
psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0002_finance_shop.sql" >/dev/null || { echo "MIGRATION 0002 FAILED"; exit 1; }

A=00000000-0000-0000-0000-00000000000a
S1=00000000-0000-0000-0000-0000000000b1
S2=00000000-0000-0000-0000-0000000000b2
S3=00000000-0000-0000-0000-0000000000b3
C1=00000000-0000-0000-0000-0000000000c1
C2=00000000-0000-0000-0000-0000000000c2

psql -qX -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<SQL
insert into auth.users(id) values ('$A'),('$S1'),('$S2'),('$S3');
insert into profiles(id,username,full_name,role,active) values
 ('$A','admin','المدير','admin',true),('$S1','ahmad','أحمد','student',true),
 ('$S2','sara','سارة','student',true),('$S3','old','قديم','student',false);
insert into classes(id,title,weekday,start_time,end_time) values
 ('$C1','ملاكمة مبتدئين',0,'17:00','18:00'),('$C2','ملاكمة متقدم',1,'19:00','20:30');
insert into classes(title,weekday,start_time,end_time,active) values ('ملغى',2,'10:00','11:00',false);
insert into enrollments values ('$S1','$C1',now()),('$S2','$C2',now()),('$S3','$C1',now());
insert into subscriptions(student_id,plan,start_date,end_date) values
 ('$S1','شهري','2026-10-01','2026-10-31'),('$S2','شهري','2026-10-01','2026-10-31'),('$S3','شهري','2026-01-01','2026-01-31');
insert into announcements(title,body,class_id) values ('للجميع','x',null),('C1','x','$C1'),('C2','x','$C2');
insert into chat_messages(student_id,sender_id,body) values ('$S1','$S1','مرحبا'),('$S1','$A','أهلا'),('$S2','$S2','سؤال');
SQL

PASS=0; FAIL=0
# q <uid|anon> <sql> : run as that user, print single value or ERROR
q() {
  local who=$1 sql=$2 role=authenticated sub=$1
  [ "$who" = anon ] && { role=anon; sub=""; }
  psql -qXtA -d "$DB" 2>&1 <<SQL | grep -v -e '^SET$' -e '^CONTEXT:' | tail -n1
set role $role; set request.jwt.claim.sub = '$sub';
$sql
SQL
}
check() { # name expected actual
  if [[ "$3" == $2 ]]; then PASS=$((PASS+1)); echo "ok   $1"; else FAIL=$((FAIL+1)); echo "FAIL $1 (expected '$2', got '$3')"; fi
}

check "anon cannot read profiles"            "*permission denied*" "$(q anon 'select count(*) from profiles')"
check "anon cannot read classes"             "*permission denied*" "$(q anon 'select count(*) from classes')"
check "student sees only own profile"        "1"  "$(q $S1 'select count(*) from profiles')"
check "admin sees all profiles"              "4"  "$(q $A  'select count(*) from profiles')"
check "student cannot promote self"          "0"  "$(q $S1 "with u as (update profiles set role='admin' where id='$S1' returning 1) select count(*) from u")"
check "student role unchanged"               "student" "$(q $A "select role from profiles where id='$S1'")"
check "student cannot insert profile"        "*row-level security*" "$(q $S1 "insert into profiles(id,username,full_name) values ('$S3','x_y','zz')")"
check "student sees only active classes"     "2"  "$(q $S1 'select count(*) from classes')"
check "admin sees all classes"               "3"  "$(q $A  'select count(*) from classes')"
check "student cannot create class"          "*row-level security*" "$(q $S1 "insert into classes(title,weekday,start_time,end_time) values ('x',1,'10:00','11:00')")"
check "student sees own enrollments only"    "1"  "$(q $S1 'select count(*) from enrollments')"
check "student cannot self-enroll"           "*row-level security*" "$(q $S1 "insert into enrollments values ('$S1','$C2',now())")"
check "student sees own subscription only"   "1"  "$(q $S1 'select count(*) from subscriptions')"
check "student cannot extend subscription"   "0"  "$(q $S1 "with u as (update subscriptions set end_date='2030-01-01' returning 1) select count(*) from u")"
check "student cannot add subscription"      "*row-level security*" "$(q $S1 "insert into subscriptions(student_id,plan,start_date,end_date) values ('$S1','free','2026-01-01','2030-01-01')")"
check "S1 sees global + C1 announcements"    "2"  "$(q $S1 'select count(*) from announcements')"
check "S2 sees global + C2 announcements"    "2"  "$(q $S2 'select count(*) from announcements')"
check "student cannot post announcement"     "*row-level security*" "$(q $S1 "insert into announcements(title,body) values ('x','y')")"
check "S1 sees own thread only"              "2"  "$(q $S1 'select count(*) from chat_messages')"
check "S2 cannot read S1 thread"             "0"  "$(q $S2 "select count(*) from chat_messages where student_id='$S1'")"
check "admin sees all chat"                  "3"  "$(q $A  'select count(*) from chat_messages')"
check "student can send in own thread"       "1"  "$(q $S1 "with i as (insert into chat_messages(student_id,sender_id,body) values ('$S1','$S1','hi') returning 1) select count(*) from i")"
check "student cannot post into other thread" "*row-level security*" "$(q $S1 "insert into chat_messages(student_id,sender_id,body) values ('$S2','$S1','hi')")"
check "student cannot spoof sender"          "*row-level security*" "$(q $S1 "insert into chat_messages(student_id,sender_id,body) values ('$S1','$A','fake admin')")"
check "student cannot edit messages"         "0"  "$(q $S1 "with u as (update chat_messages set body='x' returning 1) select count(*) from u")"
check "student cannot delete messages"       "0"  "$(q $S1 "with d as (delete from chat_messages returning 1) select count(*) from d")"
check "admin can reply in any thread"        "1"  "$(q $A  "with i as (insert into chat_messages(student_id,sender_id,body) values ('$S2','$A','رد') returning 1) select count(*) from i")"
check "inactive student sees no classes"     "0"  "$(q $S3 'select count(*) from classes')"
check "inactive student sees no announcements" "0" "$(q $S3 'select count(*) from announcements')"
check "inactive student cannot chat"         "*row-level security*" "$(q $S3 "insert into chat_messages(student_id,sender_id,body) values ('$S3','$S3','hi')")"
check "inactive student sees no subscription" "0" "$(q $S3 'select count(*) from subscriptions')"
check "student cannot call admin_threads"    "*not allowed*" "$(q $S1 'select count(*) from admin_threads()')"
check "admin_threads lists 2 threads"        "2"  "$(q $A  'select count(*) from admin_threads()')"
check "admin unread count for S1 = 2"        "2"  "$(q $A  "select unread from admin_threads() where student_id='$S1'")"
q $S1 "select mark_thread_read('$S1')" >/dev/null
check "student read marks only admin msgs"   "1"  "$(q $A  "select count(*) from chat_messages where student_id='$S1' and read_at is not null")"
check "student cannot mark other thread"     "*not allowed*" "$(q $S1 "select mark_thread_read('$S2')")"
q $A "select mark_thread_read('$S1')" >/dev/null
check "admin read clears S1 unread"          "0"  "$(q $A  "select unread from admin_threads() where student_id='$S1'")"
check "mark_announcements_seen works"        "t"  "$(q $S1 "select mark_announcements_seen(); select announcements_seen_at > now() - interval '5 seconds' from profiles where id='$S1'")"
check "anon cannot call RPC"                 "*permission denied*" "$(q anon 'select mark_announcements_seen()')"

# ---- 0002: prices, shop, money ----
psql -qX -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<SQL
insert into products(name,price,type,available) values ('قفازات',120,'equipment',true),('مخفي',50,'equipment',false);
insert into expenses(category,amount,spent_on) values ('rent',2000,'2026-10-01');
SQL
check "anon reads prices"                     "3"  "$(q anon 'select count(*) from categories')"
check "youth monthly price is 250"            "250.00" "$(q anon "select monthly_price from categories where key='youth'")"
check "anon sees only available products"     "1"  "$(q anon 'select count(*) from products')"
check "admin sees all products"               "2"  "$(q $A  'select count(*) from products')"
check "anon cannot change prices"             "*permission denied*" "$(q anon "update categories set monthly_price=1")"
check "student cannot change prices"          "0"  "$(q $S1 "with u as (update categories set monthly_price=1 returning 1) select count(*) from u")"
check "student cannot add product"            "*row-level security*" "$(q $S1 "insert into products(name,price) values ('x',1)")"
check "anon cannot read payments"             "*permission denied*" "$(q anon 'select count(*) from payments')"
check "anon cannot read expenses"             "*permission denied*" "$(q anon 'select count(*) from expenses')"
check "student cannot read expenses"          "0"  "$(q $S1 'select count(*) from expenses')"
check "student cannot add payment"            "*row-level security*" "$(q $S1 "insert into payments(student_id,kind,amount) values ('$S1','subscription',250)")"
check "student cannot call record_subscription" "*forbidden*" "$(q $S1 "select record_subscription('$S1','youth','شهري','2026-11-01','2026-11-30',0,null)")"
q $A "select record_subscription('$S2','youth','شهري','2026-11-01','2026-11-30',250,null)" >/dev/null
check "record_subscription writes payment"    "250.00" "$(q $A "select amount from payments where student_id='$S2' and kind='subscription'")"
check "subscription carries category"         "youth" "$(q $A "select category from subscriptions where student_id='$S2' and start_date='2026-11-01'")"
check "student cannot read own payments"      "0"  "$(q $S2 'select count(*) from payments')"
q $A "delete from subscriptions where student_id='$S2' and start_date='2026-11-01'" >/dev/null
check "deleting subscription removes payment" "0"  "$(q $A "select count(*) from payments where student_id='$S2'")"
check "zero or negative payment rejected"     "*violates check*" "$(q $A "insert into payments(kind,amount) values ('other',0)")"
check "admin can record expense"              "1"  "$(q $A "with i as (insert into expenses(category,amount) values ('electricity',430.5) returning 1) select count(*) from i")"

echo "----"; echo "passed $PASS, failed $FAIL"
dropdb "$DB"
[ "$FAIL" -eq 0 ]
